//{Object} order - { symbol, operation, quantity, price, priority }

import fs from 'fs';
import path from 'path';
import { addRequest, startQueueRunner } from './requestsQueue.js';
import {cancelOrder} from '../core/cancelOrder.js';
import { isBISTopen } from '../../misc/bistStatus.js';
import gunlukIslemler from '../core/gunlukIslemler.js';
import { subAccount } from '../core/subAccount.js';
import { portfoyBilgisi } from '../core/portfoyBilgisi.js';


import { fileURLToPath } from 'url';
import { liveGetCash, liveGetCashRaw, liveGetCeilingFloor, liveGetStockRaw, liveSyncCash, liveSyncDatabaseWithPositions, liveUpdateCash, liveUpdateStock } from './lib/portfolioService.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storagePath = path.resolve(__dirname, '../storage/orders.json');

async function placeNewOrder(order){

    order.refCode = "0";
    const { isOpen, dateAtOpen } = await isBISTopen();
    if(isOpen){
        order.date = new Date().toISOString();  // saving the order with current date
        const { ceiling, floor } = await liveGetCeilingFloor(order.symbol);
        if (order.price >= ceiling || order.price <= floor) {
            order.refCode = "2"; // reserve the order for the 16.00 utc - market closing
            let newdate = new Date();
            newdate.setUTCHours(16, 0, 0, 0); // Sets hour to 16, minutes/seconds/milliseconds to 0
            order.date = newdate.toISOString();
            console.log(`🔒 The symbol hit ceiling / floor, and is locked. Reserving for:\n${order.date}`);
        }
    }
    else {
        order.date = dateAtOpen.toISOString();
        console.log(`📅 BIST is closed. Saving order with next market open time: ${order.date}`);
    }
    order.tryCount = 0;
    order.transactionDate = new Date().toISOString();

    // Saving the orders into JSON file
    if (!fs.existsSync(path.dirname(storagePath))) {
        fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    }

    let orders = [];
    if (fs.existsSync(storagePath)) {
        try {
            orders = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        } catch {
            console.log("⚠️ orders.json invalid, starting fresh");
        }
    }

    // BUY - BUY or SELL - SELL orders CHECK
    const sameType = orders.find(o => o.symbol === order.symbol && o.operation === order.operation);
    if(sameType){
        console.log(`🚫 There is already a ${order.operation} order for ${order.symbol} (ID: ${sameType.id}). Skipping new order!`);
        return;
    }

    // BUY - SELL CANCELLATION CHECK
    const opposite = order.operation === 'BUY' ? 'SELL' : 'BUY';
    const conflict = orders.find(o => o.symbol === order.symbol && o.operation === opposite);
    let cancelled = false;

    if (conflict) {
        if (conflict.refCode !== "0" || conflict.refCode !== "2") {  // Means it is sent
            console.log(`🛑 Cancelling request for sent ${conflict.operation} for ${conflict.symbol} order ID ${conflict.id} (RefCode: ${conflict.refCode})`);
            //await cancelOrder(conflict.refCode);
            addRequest('CANCEL');
            //startQueueRunner();

            // Find and mark the order as "CANCEL"
            const conflictIdx = orders.findIndex(o => o.id === conflict.id);
            if (conflictIdx !== -1) {
                const order2cancel = orders[conflictIdx];
                // Before we mark the order as CANCEL, lets do the database transactions.
                const value = order2cancel.quantity * order2cancel.price;
                if (order2cancel.operation === "BUY") {
                    liveUpdateCash(liveGetCashRaw() + value);
                } else if (order2cancel.operation === "SELL") {
                    liveUpdateCash(liveGetCashRaw() - value);
                }
                orders[conflictIdx].operation = "CANCEL";
            }
            cancelled = true;
        } else {
            console.log(`🗑 Removing pending ${conflict.operation} order ID ${conflict.id}`);
            orders = orders.filter(o => o.id !== conflict.id);
            cancelled = true;
        }
    }

    if (cancelled) {
        console.log(`⚠️ New ${order.operation} order for ${order.symbol} skipped due to conflict.`);
    }
    else {
        //save and queue the order
        const maxId = orders.reduce((max, o) => Math.max(max, o.id || 0), 0);
        order.id = maxId + 1;   // id handling!

        orders.push(order); // add the new order
        console.log(`💾 Saved Order ID ${order.id} (${order.symbol})`);

        addRequest('ORDER');
        //startQueueRunner();
    }
    fs.writeFileSync(storagePath, JSON.stringify(orders, null, 2));
    startQueueRunner();
}

// This function checks whether the order completed or not
// We will call it every 5 min in Algolab Session (and delete the order if the description field is "Gerçekleşti")
async function handleGunlukIslemCheck(){
    if (!fs.existsSync(storagePath)) {
        console.log("⚠️ orders.json not found.");
        return;
    }

    // Fetch "Hisse Günlük İşlemler" from API
    let response;
    try {
        response = await gunlukIslemler();
    } catch(err){
        console.log("❌ Failed to fetch gunlukIslemler data:", err.message);
        return;
    }

    let orders = [];
    try {
        orders = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    } catch (err) {
        console.log("❌ Failed to read orders.json:", err.message);
        return;
    }

    // Assuming each transaction given in the content field 
    let transactions = response?.content || response?.data?.content || response?.data || [];

    if(!Array.isArray(transactions)){
        console.log("⚠️ Invalid or empty response from gunlukIslemler.");
        return;
    }

    let changed = false;

    // Take each order from orders.json and find the matched refCodes
    for(let i = orders.length - 1; i >= 0; i--){
        const order = orders[i];
        const refCode = order.refCode;
        if (!refCode || refCode === "0") continue; // skip unsent orders

        // If the refCodes are matched and the description is "Gerçekleşti" --> remove
        const match = transactions.find(txn =>
            txn.atpref === refCode && (txn.description === 'Gerçekleşti' || txn.description === 'Silindi') 
        );

        if (match) {
            console.log(`✅ Order ID ${order.id} (refCode: ${refCode}) matched with Günlük İşlem. Checking...`);
            console.log(`🔎 ${JSON.stringify(match)}`);

            // The order quantity control - Assuming fillunit can not be larger than order.quantity
            // Piyasa emirleri için insufficient fund uyarısı bize direk refCode döndürmüyor.
            // Bu quantity problemi genelde tavan / taban durumlarında oluyor.
            if (String(order.quantity) !== match.fillunit && match.description !== 'Silindi') {
                const newQuantity = order.quantity - match.fillunit;
                orders[i].quantity = newQuantity;
                orders[i].refCode = "0";
                orders[i].tryCount++;
                addRequest('ORDER');
                startQueueRunner();
                console.log(`Order quantity failed to match. Resending with ${orders[i].quantity} quantity.`);
                changed = true;
                continue;
            }

            // Edit the database now. Until the two CHECK functions arrive - this will provide a mostly accurate database.
            const { symbol, operation, quantity } = order;

            const currentCash = liveGetCashRaw();

            // Use the actual transaction price instead of order's price
            let price = parseFloat(match.price);
            if (isNaN(price)) {
                console.log(`⚠️ Invalid executed price in transaction. Skipping database update for order ID ${order}`);
                price = 0;
            }

            if (operation === "BUY" && match.description !== 'Silindi') {
                // Fetch current position before update
                const currentPosition = liveGetStockRaw(symbol);
                const oldQty = currentPosition?.quantity || 0;
                const oldAvg = currentPosition?.avgPrice || 0;
            
                const newQty = oldQty + quantity;
                const newAvg = ((oldQty * oldAvg) + (quantity * price)) / newQty;
                const finalCost = quantity * price;
            
                liveUpdateStock(symbol, newQty, newAvg);
                liveUpdateCash(currentCash - finalCost);
            }
        
            else if (operation === "SELL" && match.description !== 'Silindi') {
                const totalRevenue = quantity * price;
                liveUpdateStock(symbol, 0, 0); // full sell assumed
                liveUpdateCash(currentCash + totalRevenue);
            }

            orders.splice(i, 1);
            changed = true;
        }

    }
    if(changed){
        fs.writeFileSync(storagePath, JSON.stringify(orders, null, 2));
        console.log("💾 Updated orders.json after Günlük İşlem check.");
    } else{
        console.log("ℹ️ No matching orders to delete from Günlük İşlemler.");
    }
    
}

async function handleCashBalanceCheck(){
    try {
        const data = await subAccount();
        liveSyncCash(data.content[0].tradeLimit)
    } catch (err) {
        console.log("❌ Error in subAccount():", err.message || err);
    }
}

async function handlePortfolioCheck() {
    try {
        const data = await portfoyBilgisi();
        liveSyncDatabaseWithPositions(data.content);
    } catch (err) {
        console.log("❌ Error in portfoyBilgisi():", err.message || err);
    }
}


function handleOrderMesssage(msg){
    const content = msg.Content;
    const executedLot = content?.ExecutedLot ?? null;
    const comment = content?.Comment ?? "";

    // extract the refCode from comment
    const refMatch = comment.match(/Referans Numaranız:\s*([A-Z0-9]+)/);
    if (!refMatch || !refMatch[1]) {
        console.log('⚠️ No valid refCode found in comment.');
        return;
    }

    const refCode = refMatch[1];

    if (!fs.existsSync(storagePath)) {
        console.log("⚠️ orders.json not found.");
        return;
    }

    let orders = [];
    try {
        orders = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    } catch {
        console.log("❌ Failed to read orders.json");
        return;
    }

    const matchedOrderIndex = orders.findIndex(o => o.refCode === refCode);
    if (matchedOrderIndex === -1) {
        console.log(`❌ No matching order found for refCode: ${refCode}`);
        return;
    }

    const matchedOrder = orders[matchedOrderIndex];

    if (executedLot === matchedOrder.quantity){
        console.log(`✅ Order (refCode ${refCode}) executed successfully. Deleting from orders.json`);
        orders.splice(matchedOrderIndex, 1); // removed from json
        fs.writeFileSync(storagePath, JSON.stringify(orders, null, 2));
    } else if (executedLot > 0 && executedLot < matchedOrder.quantity) {

    } else {
        console.log(`🔁 Order (refCode ${refCode}) failed to execute. Resending...`);
        const tryCount = matchedOrder.tryCount ?? 0;
        matchedOrder.tryCount = tryCount + 1;

        // Remove the failed order from orders.json
        orders.splice(matchedOrderIndex, 1);
        fs.writeFileSync(storagePath, JSON.stringify(orders, null, 2));

        // Resend order
        matchedOrder.refCode = "0";
        placeNewOrder(matchedOrder);
    }
}

// This function checks whether the 15 min passed over the time order sent or not (if BIST is open)
async function check15Mins(){
    const now = new Date();

    let orders = [];

    try {
        if (fs.existsSync(storagePath)) {
        orders = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        }
    } catch (err) {
        console.log('❌ Failed to read orders.json in check15Mins:', err.message);
        return;
    }

    // 🔄 Traverse backwards so splice won't skip elements

    let changed = false;
    for(let i = orders.length - 1; i >= 0; i--){
        const order = orders[i];
        if(order.date){
            const orderTime = new Date(order.date);
            const diffInMinutes = (now - orderTime) / (1000 * 60);
            console.log(`Order ID ${order.id} Order Symbol: ${order.symbol} Difference: ${diffInMinutes.toFixed(2)} minutes`);

            if(diffInMinutes >= 15){
                if(!order.refCode || order.refCode === "0" || order.refCode === "1"){
                    // Not sent
                    console.log(`⏰ Order ID ${order.id} (refCode ${order.refCode}) timed out (NOT SENT). Removing from orders.json.`);
                    orders.splice(i, 1);
                    changed = true;
                } else if (order.refCode === "2") {
                    console.log(`⏰ Order ID ${order.id} was RESERVED for ${order.date}\nWe are now sending the order at ${now}.`);
                    orders[i].refCode = "0";
                    addRequest("ORDER");
                    changed = true;
                } else {
                    console.log(`⏰ Order ID ${order.id} (refCode ${order.refCode}) timed out (SENT). Queuing CANCEL and marking as CANCEL.`);
                    addRequest('CANCEL', { refCode: order.refCode, orderId: order.id });
                    orders[i].operation = "CANCEL";
                    changed = true;
                }
            }
        }
    }

    if(changed){
        // Write updated orders list back to file
        fs.writeFileSync(storagePath, JSON.stringify(orders, null, 2));
        console.log(`✅ check15Mins complete. Remaining orders: ${orders.length}`);
        startQueueRunner();
    }
}

export { placeNewOrder, check15Mins, handleGunlukIslemCheck, handleCashBalanceCheck, handlePortfolioCheck, handleOrderMesssage };
