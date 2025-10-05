/*

Currently, this .js does two things in particular:
1. It builds up 15-minute candles from live data provided by Algolab WSS. (wss.js).
2. It constantly keeps and updates latest live prices from these trade messages also from WSS.

Previously, we were updating latest-prices every time a trade message has received.
This was working before we switched to BIST100 (from BIST30).
But this switch broke down sync reading-writing (because of 1000s of writing per second),
we switched to updating latest-prices ONCE EVERY SECOND. Hopefully, this will work.

*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { candleEvents } from '../misc/events.js';
import writeFileAtomic from 'write-file-atomic';
import { wssMessagesAreAlive } from './monitor/wss_monitor.js';
import('../strategies/indicator_bot.js');

// ✅ Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
// ✅ File paths
const outputPath = path.join(__dirname, 'storage', '15m-candles.json');
const latestPricesPath = path.join(__dirname, 'storage', 'latest-prices.json');

// ✅ In-memory stores
const candleStore = {};                      // Ongoing active candles
const latestCompletedCandles = new Map();    // For flush

// ✅ NEW: debounce timer
let writeTimeout = null;
const WRITE_INTERVAL_MS = 1000;
let latestPrices = {};

const FLUSH_LAG_MS = 1500; // ~1.5s for WSS stuttering

// Check for storage directory on startup.
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
  console.log("📁 Created missing 'storage/' directory");
}

// ✅ Load latest-prices.json on startup
try {
  const data = fs.readFileSync(latestPricesPath, 'utf8');
  latestPrices = JSON.parse(data);
  console.log("📥 Loaded latest-prices.json into memory");
} catch (err) {
  console.log("⚠️ Could not load latest-prices.json. Starting with empty cache:", err.message);
  latestPrices = {};
}

// ✅ NEW: Debounced write to latest-prices.json
function scheduleLatestPriceWrite() {
  if (writeTimeout) return; // already scheduled

  writeTimeout = setTimeout(() => {
    try {
      //fs.writeFileSync(latestPricesPath, JSON.stringify(latestPrices, null, 2));
      writeFileAtomic.sync(latestPricesPath, JSON.stringify(latestPrices, null, 2));
      // console.log("📝 latest-prices.json updated");
    } catch (err) {
      console.log("❌ Failed to write latest-prices.json:", err.message);
    } finally {
      writeTimeout = null;
    }
  }, WRITE_INTERVAL_MS);
}

// ✅ Round a date to the start of its 15-min interval
function get15MinStart(date) {
  return new Date(Math.floor(date.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000);
}

// ✅ Write all completed candles to disk
function saveCandlesToFile() {
  const latestCandles = [];

  for (const candles of latestCompletedCandles.values()) {
    latestCandles.push(...candles); // push both
  }

  try {
    fs.writeFileSync(outputPath, JSON.stringify(latestCandles, null, 2));
    console.log(`📝 Saved ${latestCandles.length} candles to ${outputPath}`);
  } catch (err) {
    console.log("❌ Failed to write 15m-candles.json:", err.message);
  }
  notifyWhenDone();
}


// ✅ Notify listeners after flush
function notifyWhenDone() {
  console.log("📢 All 15m candles flushed — notifying indicator bot...");
  candleEvents.emit('15mcandlesReady');
}

// ✅ Periodic flush every 15 minutes
function runFlush() {
  const now = new Date();
  const currentPeriodStart = get15MinStart(now).getTime();

  if (Object.keys(candleStore).length === 0) {
    console.log("⏱️ No candles to flush at", now.toLocaleTimeString());
    return;
  }

  // [CHANGED] move only completed candles; keep current window in memory
  let movedAny = false;
  for (const symbol in candleStore) {
    const candle = candleStore[symbol];
    if (candle.date.getTime() < currentPeriodStart) {
      const previous = latestCompletedCandles.get(symbol) || [];
      const updated = [candle, ...previous].slice(0, 2); // keep only 2
      latestCompletedCandles.set(symbol, updated);
      delete candleStore[symbol];
      movedAny = true;
    }
  }

  if (movedAny) {
    saveCandlesToFile();
  } else {
    console.log("⏱️ Boundary reached, no completed candles yet:", now.toISOString());
  }
  
}

// ✅ Align first flush to the next 15-minute boundary
function startAlignedFlush() {
  const now = new Date();
  const msNow = now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000 + now.getMilliseconds();
  const msUntilNextQuarter = (15 * 60 * 1000) - (msNow % (15 * 60 * 1000));

  // [CHANGED] add tiny lag so we don't cut off end-of-window trades
  const firstDelay = msUntilNextQuarter + FLUSH_LAG_MS;

  console.log(`⏳ First flush in ${Math.round(firstDelay / 1000)} seconds...`);

  setTimeout(() => {
    runFlush(); // precise flush at boundary + lag
    setInterval(runFlush, 15 * 60 * 1000); // then every 15 minutes
  }, firstDelay);

}

startAlignedFlush();

// ✅ Handle incoming trade message from WSS
export function handleTradeMessage(tradeData) {
  const { Symbol, Price, TradeQuantity, Date: tradeTimeStr } = tradeData;
  const tradeTime = new Date(tradeTimeStr);
  const key = Symbol;
  const periodStart = get15MinStart(tradeTime);

  // call the wss monitor
  wssMessagesAreAlive();

  const existing = candleStore[key];

  // ✅ Start new candle if it's a new 15-min block
  if (!existing || existing.date.getTime() !== periodStart.getTime()) {

    if (existing) {
      const prev = latestCompletedCandles.get(key) || [];
      const updated = [existing, ...prev].slice(0, 2);
      latestCompletedCandles.set(key, updated);
    }

    // start the new (current) window
    candleStore[key] = {
      symbol: key,
      date: periodStart,
      open: Price,
      high: Price,
      low: Price,
      close: Price,
      volume: Number(TradeQuantity) || 0
    };
  } else {
    // update current window
    const c = existing;
    if (Price > c.high) c.high = Price;
    if (Price < c.low)  c.low  = Price;
    c.close = Price;
    c.volume += Number(TradeQuantity) || 0;
  }


  // ✅ Update latest price and persist it
  latestPrices[key] = {
    price: Price,
    lastUpdated: new Date().toISOString()
  };

  scheduleLatestPriceWrite();
  
}
