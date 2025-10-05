/**
 * Cancels an order using Algolab API.
 * - Elif Pınar Balbal
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import API from './api.js';
import { liveUpdateCash, liveGetCashRaw } from '../portfolio/lib/portfolioService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD,
};

async function cancelOrder(orderId, subAccount = "") {

    try {

        const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
        const hash = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8')).hash;

        const api = new API({ ...config, token, hash });

        console.log(`🛑 Cancelling order with ID ${orderId}...`);
        const result = await api.DeleteOrder({ id: orderId, subAccount });

        if (result?.content?.message === 'Success') {

            console.log("✅ Order cancelled successfully!");
            // ✅ Locate and revert the order in orders.json
            const ordersPath = path.resolve(__dirname, '../storage/orders.json');
            let orders = [];

            if (fs.existsSync(ordersPath)) {
                try {
                    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
                } catch {
                    console.log("⚠️ Could not read orders.json for cancel update.");
                    return;
                }
            }

            // Find the order with refCode === orderId
            const index = orders.findIndex(o => o.refCode === orderId);
            if (index === -1) {
                console.log(`⚠️ Order with refCode ${orderId} not found in orders.json`);
                return;
            }

            const order = orders[index];

            orders[index].operation = 'CANCELED';

            fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));

            // Revert cash & portfolio changes if they were previously applied
            /* Doesnt work bcs operation is not buy nor sell :( -> it is cancel (EVEN NOW? CancelED).
            const value = order.quantity * order.price;
            if (order.operation === "BUY") {
                liveUpdateCash(liveGetCashRaw() + value);
            } else if (order.operation === "SELL") {
                liveUpdateCash(liveGetCashRaw() - value);
            }
            */
        } else {
            console.log("❌ Cancel failed:", result?.message || "Unknown error.");
        }
    } catch (err) {
        console.log("❌ Unexpected error in cancelOrder.js:");
        console.log(err.message || err);
    
    }
}

export { cancelOrder };