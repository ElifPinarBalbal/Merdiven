/*

This live price checker is designed to follow 4 steps:
1 - Check the latest price from /algolab/storage/latest-prices.json (where we update every trade)
2 - Then, get 15 minute delayed pricing from Yahoo Finance API.
3 - Lastly, (added on 28.07), Check TradingView if Yahoo fails.

TODO & IMPROVEMENTS:
[] - AlgoLab's symbol information function (but has 5 second cooldown.)

*/


import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import yahooFinance from 'yahoo-finance2';
import TradingView from '@mathieuc/tradingview';
import { error } from 'console';


// resolve path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const latestPricesPath = path.join(__dirname, 'storage', 'latest-prices.json');

const now = new Date();

// ✅ Step 1: Try from latest-prices.json
async function tryFromLatestJSON(symbol) {
    const upperSymbol = symbol.toUpperCase();
  
    return new Promise((resolve) => {
      fs.readFile(latestPricesPath, 'utf8', (err, data) => {
        if (err) {
          console.log(`Could not read latest-prices.json: ${err.message}`);
          return resolve(null);
        }
  
        try {
          const prices = JSON.parse(data);
          if (prices[upperSymbol]) {

            const lastUpdated = new Date(prices[upperSymbol].lastUpdated);
            const diffMs = now - lastUpdated; // difference in milliseconds
            const diffMinutes = diffMs / (1000 * 60); // convert to minutes
            if (diffMinutes > 30) return resolve(null);
            
            return resolve(prices[upperSymbol].price); // ✅ found
          }
        } catch (parseErr) {
          console.log(`JSON parse error: ${parseErr.message}`);
        }
  
        return resolve(null); // not found or parse error
      });
    });
}

// ✅ Main function to export
export async function fetchLatestPrice(symbol) {

  // 1. Try latest-prices.json
  const jsonPrice = await tryFromLatestJSON(symbol);
  if (jsonPrice !== null) {
    return jsonPrice;
  }

  // 2. Fallback to Yahoo
  try {
    const yahooPrice = await yahooGetPrice(symbol);
    return yahooPrice;
  } catch (err) {
    console.log('Fetching latest price from Yahoo failed for:', symbol, err);
  }

  // 3. TradingView as last resort
  try {
    const TVprice = await TVGetPrice(symbol);
    return TVprice;
  } catch (err) {
    console.log('Fetching latest price from TradingView failed for:', symbol, err);
    return null;
  }

}

// 2 - get yahoo price
async function yahooGetPrice(symbol) {
  const bistSymbol = `${symbol}.IS`; // For BIST stocks
  try {
    const result = await yahooFinance.quote(bistSymbol);
    return result.regularMarketPrice;
  } catch (err) {
    console.log(`❌ Failed to fetch Yahoo price for ${symbol}:`, err);
    throw err;
  }
}

// 3 - get TradingViewPrice
async function TVGetPrice(symbol, timeoutMs = 15000) {
  try {
    const client = new TradingView.Client({
      token: process.env.TRADINGVIEW_TOKEN,
      signature: process.env.TRADINGVIEW_SIGNATURE,
    });

    const quoteSession = new client.Session.Quote();
    const bistMarket = new quoteSession.Market(`BIST:${symbol}`);

    const tvPromise = new Promise((resolve, reject) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          quoteSession.delete();
          client.end();
          reject(new Error('Timeout: No price received within time limit.'));
        }
      }, timeoutMs);

      bistMarket.onData((data) => {
        console.log('📡 Live BIST data received:', data);
        if (data.lp && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          quoteSession.delete();
          client.end();
          resolve(data.lp);
        }
      });
    });

    const lp = await tvPromise;
    return lp;

  } catch (err) {
    console.log('TradingView step failed:', err.message);
    return null;
  }
}