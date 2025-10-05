import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { getTopOrder } from './ordersQueue.js';
import { sendOrder } from '../core/sendOrder.js';
import { cancelOrder } from '../core/cancelOrder.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ordersPath = path.resolve(__dirname, '../storage/orders.json');

let requestsQueue = [];
let queueRunning = false;

let currentUnprocessedCount = 0;
let processedCount = 0;

function getQueue() {
    return requestsQueue;
}

function resetQueue() {
    requestsQueue = [];
    queueRunning = false;
    currentUnprocessedCount = 0;
    processedCount = 0;
}

function printQueue() {
    console.log('\n📦 Current Queue:');
    requestsQueue.forEach((req, idx) => {
        console.log(`${idx + 1}. ${req.requestType}`);
    });
}

function addRequest(requestType) {
    if (requestType !== 'ORDER' && requestType !== 'CANCEL') {
        requestsQueue.push({ requestType });
        return;
    }

    const checkIndices = requestsQueue
        .map((r, i) => (r.requestType === 'CHECK' ? i : -1))
        .filter(i => i !== -1);

    if (checkIndices.length === 0) {
        requestsQueue.push({ requestType }, { requestType: 'CHECK' });
        currentUnprocessedCount = 1;
        processedCount = 0;
        return;
    }

    if (checkIndices.length === 1) {
        const lastCheckIndex = checkIndices[0];

        // 🔄 Recompute unprocessed before CHECK
        let newUnprocessed = 0;
        for (let i = 0; i < lastCheckIndex; i++) {
            if (requestsQueue[i].requestType === 'ORDER' || requestsQueue[i].requestType === 'CANCEL') newUnprocessed++;
        }

        const total = newUnprocessed + processedCount;

        if (total >= 5) {
            requestsQueue.push({ requestType }, { requestType: 'CHECK' });
            currentUnprocessedCount = 1;
            processedCount = 0;
        } else {
            requestsQueue.splice(lastCheckIndex, 0, { requestType });
            currentUnprocessedCount = newUnprocessed + 1;
        }
        return;
    }

    // ✅ More than 1 CHECK
    const lastCheckIndex = checkIndices[checkIndices.length - 1];
    const prevCheckIndex = checkIndices[checkIndices.length - 2];

    let unprocessedBetween = 0;
    for (let i = prevCheckIndex + 1; i < lastCheckIndex; i++) {
        if (requestsQueue[i].requestType === 'ORDER' || requestsQueue[i].requestType === 'CANCEL') unprocessedBetween++;
    }

    const total = unprocessedBetween;

    if (total >= 5) {
        requestsQueue.push({ requestType }, { requestType: 'CHECK' });
        currentUnprocessedCount = 1;
        processedCount = 0;
    } else {
        requestsQueue.splice(lastCheckIndex, 0, { requestType });
        currentUnprocessedCount = unprocessedBetween + 1;
    }
}

function startQueueRunner() {
    if (queueRunning) {
        console.log('⚠️ Queue is already running...');
        return;
    }
      

    if (requestsQueue.length === 0) {
        console.log('🟦 Queue is empty. Nothing to run.');
        return;
    }
    // ✅ Reinitialize counters before running
    const checkIndices = requestsQueue
    .map((r, i) => (r.requestType === 'CHECK' ? i : -1))
    .filter(i => i !== -1);

    if (checkIndices.length > 0) {
        const lastCheckIndex = checkIndices[checkIndices.length - 1];

        let unprocessedBefore = 0;
        for (let i = 0; i < lastCheckIndex; i++) {
            if (requestsQueue[i].requestType === 'ORDER' || requestsQueue[i].requestType === 'CANCEL') {
                unprocessedBefore++;
            }
        }

        currentUnprocessedCount = unprocessedBefore;
        processedCount = 0;
    }

    queueRunning = true;

    const processNext = async() => {

        // ✅ CHECK FOR PRIORITY REQUESTS AT RUNTIME
        const priorityIndex = requestsQueue.findIndex(
            r => r.requestType === 'CASH_CHECK' || r.requestType === 'PORTFOLIO_CHECK'
        );
        
        if (priorityIndex !== -1 && priorityIndex !== 0) {
            // Move priority request to front if it's not already first
            const [priorityRequest] = requestsQueue.splice(priorityIndex, 1);
            requestsQueue.unshift(priorityRequest);
            console.log(`🔥 Priority request ${priorityRequest.requestType} moved to front`);
        }

        if (requestsQueue.length === 0) {
            console.log('✅ Queue is fully processed.');
            queueRunning = false;
            return;
        }
        const next = requestsQueue.shift();
        if (!next) {
            queueRunning = false;
            return;
        }

        console.log(`🔄 Processing: ${next.requestType}`);

        if (next.requestType === 'ORDER') {
            
            let orders = [];
            // filling the orders array with JSON orders
            if (fs.existsSync(ordersPath)) {
                try {
                    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
                } catch {
                    console.log('❌ Failed to read orders.json');
                }
            }

            const unprocessedOrders = orders.filter(order => order.refCode === "0");
            const topOrder = getTopOrder(unprocessedOrders);

            if (topOrder) {
                console.log(`🟢 Executing Order: ${topOrder.operation} ${topOrder.symbol} | ID: ${topOrder.id} | Qty: ${topOrder.quantity} | Prc: ${topOrder.price} (Priority: ${topOrder.priority})`);
                // ✅ Then: mark it as processed in the orders array
                const orderToUpdate = orders.find(o => o.id === topOrder.id);
                if (orderToUpdate) {
                    orderToUpdate.refCode = "1";
                    //orderToUpdate.tryCount++;
                    try {
                        fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');
                        console.log(`✅ Order ${topOrder.id} marked as processing.`);
                    } catch (err) {
                        console.log(`❌ Failed to update orders.json: ${err.message}`);
                    }
                }
                await sendOrder(topOrder);

            } else {
                console.log('⚠️ No order found in orders.json.');
            }

            if (currentUnprocessedCount > 0) {
                currentUnprocessedCount--;
                processedCount++;
            }
        }

        if (next.requestType === 'CANCEL') {

            let orders = [];
            // filling the orders array with JSON orders
            if (fs.existsSync(ordersPath)) {
                try {
                    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
                } catch {
                    console.log('❌ Failed to read orders.json');
                }
            }

            // 🔍 Filter unprocessed CANCEL orders
            const cancelOrders = orders.filter(order => order.operation === "CANCEL" && order.refCode !== "0" && order.refCode !== "1");

            if (cancelOrders.length > 0) {
                const topCancel = cancelOrders[0]; // process only the first one
                console.log(`🔴 Executing CANCEL: ${topCancel.symbol} | RefCode: ${topCancel.refCode}`);

                try {
                    await cancelOrder(topCancel.refCode);
                } catch (err) {
                    console.log(`❌ Failed to cancel order ${topCancel.refCode}:`, err.message);
                }

                // No update logic because cancelled orders appears in CHECK.

            } else {
                console.log('⚠️ No CANCEL orders found to process.');
            }

            // Update tracking counters
            if (currentUnprocessedCount > 0) {
                currentUnprocessedCount--;
                processedCount++;
            }

        }

        if (next.requestType === 'CHECK') {
            console.log('🟡 CHECK executed.');

            try {
                const { handleGunlukIslemCheck } = await import('./connectQueues.js');
                await handleGunlukIslemCheck();
            } catch (err) {
                console.log('❌ Error running handleGunlukIslemCheck:', err);
            }
            // Look ahead: what's in queue after this CHECK?
            const nextCheckIndex = requestsQueue.findIndex(r => r.requestType === 'CHECK');
            let unprocessed = 0;

            if (nextCheckIndex === -1) {
                // No next CHECK — count all ORDERs
                unprocessed = requestsQueue.filter(r => r.requestType === 'ORDER').length;
            } else {
                // Count ORDERs before next CHECK
                for (let i = 0; i < nextCheckIndex; i++) {
                    if (requestsQueue[i].requestType === 'ORDER') unprocessed++;
                }
            }

            currentUnprocessedCount = unprocessed;
            processedCount = 0;
        }

        if (next.requestType === 'CASH_CHECK') {
            try {
                const { handleCashBalanceCheck } = await import('./connectQueues.js');
                await handleCashBalanceCheck();
            } catch (err) {
                console.log('❌ Error running handleCashBalanceCheck:', err);
            }
        }

        if (next.requestType === 'PORTFOLIO_CHECK') {
            try {
                const { handlePortfolioCheck } = await import('./connectQueues.js');
                await handlePortfolioCheck();
            } catch (err) {
                console.log('❌ Error running handlePortfolioCheck:', err);
            }
        }

        setTimeout(() => processNext(), 5100); // ✅ DELAYED call to next run
    };
  processNext();
}

function printQueueMapping() {
    console.log('\n🧮 Counters for last CHECK:');
    console.log(`Unprocessed: ${currentUnprocessedCount}, Processed: ${processedCount}`);

    console.log('\n📋 Full Queue:');
    requestsQueue.forEach((r, i) => {
        console.log(`${i + 1}. ${r.requestType}`);
    } );

    console.log('\n✅ End of status\n');
}

export {
  addRequest,
  printQueue,
  resetQueue,
  startQueueRunner,
  getQueue,
  printQueueMapping
};

