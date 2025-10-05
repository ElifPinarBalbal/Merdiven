import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ordersPath = path.resolve(__dirname, '../algolab/storage/orders.json');

export async function waitUntilOrdersJsonIsEmpty(timeoutMs = 5 * 60 * 1000, checkIntervalMs = 1000) {
    const start = Date.now();
    if (!fs.existsSync(ordersPath)) {
        console.log("ℹ️ orders.json does not exist. Skipping wait.");
        return;
    }
    while (true) {
        try {
            const content = fs.readFileSync(ordersPath, 'utf-8').trim();
            const orders = content ? JSON.parse(content) : [];
            if (Array.isArray(orders) && orders.length === 0) {
                console.log("✅ orders.json is now empty.");
                break;
            } else {
                console.log(`⏳ Waiting for orders.json to be empty... (${orders.length} remaining)`);
            }
        } catch (err) {
            console.log("⚠️ Error reading orders.json:", err.message);
        }

        if (Date.now() - start > timeoutMs) {
            console.log("❌ Timed out waiting for orders.json to be empty.");
            break; // or throw / exit early if desired
        }

        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
}