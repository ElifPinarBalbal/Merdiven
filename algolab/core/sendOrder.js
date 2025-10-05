/**
 * Sends a trading order via Algolab API using saved session credentials.
 * - Elif Pınar Balbal
 */
import 'dotenv/config';
import fs from 'fs';
import API from './api.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { liveGetCashRaw, liveUpdateCash } from '../portfolio/lib/portfolioService.js';
import { addRequest, startQueueRunner } from '../portfolio/requestsQueue.js';
import { LiveBot_Buy, LiveBot_BuyNotify } from '../../bot_main/lib/livebot.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD,
};

async function sendOrder(order) {

    try {
        const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
        const hash = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8')).hash;

        const api = new API({ ...config, token, hash });

        const orderDetails = {
            symbol: order.symbol,                           // Ticker
            direction: order.operation,                     // BUY or SELL
            pricetype: "piyasa",                            // LIMIT or MARKET
            price: "",                                      // Only used if LIMIT
            lot: order.quantity.toString(),                 // How many lots
            sms: false,
            email: false,
            subAccount: ""                                  // Optional
        };

        // tryCount check
        if (order.tryCount >= 3) {
            const ordersPath = path.resolve(__dirname, '../storage/orders.json');
            let orders = [];
            if (fs.existsSync(ordersPath)) {
                try {
                    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
                } catch {
                    console.log("❌ Could not read orders.json for tryCount check.");
                    return;
                }
            }
            const index = orders.findIndex(o => o.id === order.id);
            if (index === -1) {
                console.log(`⚠️ Order with ID ${order.id} not found in orders.json (tryCount was >= 3 too...)`);
                return;
            }
            orders.splice(index, 1);
            fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
            console.log(`⚠️ Order with ID ${order.id} not sent. tryCount >= 3.\n${order.operation} - ${order.symbol} - ${order.quantity}`);

            return;
        }

        console.log("📤 Sending order to Algolab...");

        const result = await api.SendOrder(orderDetails);

        if (result?.success) {
            console.log("✅ Order sent to AlgoLab");
            console.log(result);

            // match the reference code
            const match = result.content?.match(/Referans Numaranız:\s*(\w+);/);
            const refCode = match ? match[1] : null;

            // 📝 Update the order in orders.json
            const ordersPath = path.resolve(__dirname, '../storage/orders.json');
            let orders = [];

            if (fs.existsSync(ordersPath)) {
                try {
                    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
                } catch {
                    console.log("❌ Could not read orders.json for ref update.");
                    return;
                }
            }
            const index = orders.findIndex(o => o.id === order.id);
            if (index === -1) {
                console.log(`⚠️ Order with ID ${order.id} not found in orders.json`);
                return;
            }
            
            if (!refCode) {

                console.log("⚠️ Couldn't extract reference code.");

                if (result.content === 'İşlem bakiyesi yetersiz.TradeLimitInsufficient') {
                    // Resend order after cash check.
                    //orders.splice(index, 1); //- deletes the order
                    console.log(`💸 Insufficient funds. Changing order ID ${order.id} due to insufficient balance. Adding CASH_CHECK.\n${order.operation} - ${order.symbol} - ${order.quantity}`);
                    orders[index].tryCount++;
                    if (order.quantity >= 0) {
                        orders[index].quantity--;
                        orders[index].refCode = "0";
                        console.log(`Order quantity decreased to: ${orders[index].quantity}`);
                        addRequest('ORDER');
                    } else {
                        orders.splice(index, 1);
                        console.log(`Order quantity could not be decreased more - removed the order.`);
                    }
                    fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
                    addRequest('CASH_CHECK');
                    startQueueRunner();

                    /*
                    if (order.operation === 'BUY') {
                        setTimeout(() => {
                            LiveBot_BuyNotify({symbol: order.symbol, priceLimit: (process.env.BUY_LIMIT / 2)}, {reason: `💸 Insufficient funds.`, reasonText: 'Order was failed to sent because of insufficient funds - failed perception of local database vs. bank account :).\nUpdated balance above.\n\nWant to resend the order?'});
                        }, 6000); // 6 seconds delay
                    }
                    */
                }
                return;

            }

            orders[index].refCode = refCode;

            // Added to update the database - for cash (until CASH_CHECK every minute)
            /*
            const orderValue = order.price * order.quantity;

            if (order.operation === "BUY") {
                liveUpdateCash(liveGetCashRaw() - orderValue);
            } else if (order.operation === "SELL") {
                liveUpdateCash(liveGetCashRaw() + orderValue);
            }
            */

            fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
            console.log(`💾 RefCode ${refCode} updated in orders.json for order ID ${order.id}`);

        
        } else {
            console.log("❌ Order failed:", result?.message || "Unknown error.");
        }

    } catch (error) {
            console.log("❌ Unexpected error in sendOrder.js:");
            console.log(error.message || error);
    }
}

export {sendOrder};


