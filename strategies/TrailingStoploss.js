/*

Trailing Stoploss indicator based on percentage - Arda

Trailing stoploss will set up a price point where if candle closing
falls below that price point, it will automatically SELL.

The price point set can only go UP, not DOWN.

This indicator sets up a hardwall of:

3%
(last updated: 26.06.2025)

*/

import { fetchChartData } from "./priceService.js";
import { fetchLatestPrice } from "../algolab/livePrice.js";

export async function indicatorTrailingStopFromEntryDate(
    symbol,
    entryDate,
    trailingPercent = 7,
    option = 0
  ) {
    // 1. Download enough price data (adjust period to your needs)
    let prices;
    if (option === 0) {
    //prices = await fetchChartData(`${symbol}.IS`, `${format_DateOnly(date)}`, "5d", "15m");
        prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "60d", "15m");
    } else {
        prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "1y", "1d");
    }
    const pricedata = prices.quotes;
  
    // 2. Find the first candle >= entryDate
    const entryTime = new Date(entryDate).getTime();
  
    let entryIdx = null;
    for (let i = pricedata.length - 1; i >= 0; i--) {
      const candle = pricedata[i];
      // Try 'datetime', 'date', or 'timestamp' fields depending on your fetcher
      let t;
      if (candle.datetime) t = new Date(candle.datetime).getTime();
      else if (candle.date) t = new Date(candle.date).getTime();
      else if (candle.timestamp) t = candle.timestamp * 1000;
      else continue;
      if (t >= entryTime) entryIdx = i;
    }
    //if (entryIdx == null) throw new Error("Entry date is after last candle!");
    if (entryIdx === null) {
      entryIdx = pricedata.length - 1;
    }
  
    // 3. Clean missing close values and slice from entry onwards
    let closes = [];
    let cleanedData = [];
    for (let i = entryIdx; i < pricedata.length; i++) {
      const d = pricedata[i];
      if (d.close != null) {
        closes.push(d.close);
        cleanedData.push(d);
      }
    }
  
    // 4. Simulate trailing stop from entry onwards
    let highest = closes[0];
    let stoploss = highest * (1 - trailingPercent / 100);
    let signal = "HOLD";
  
    for (let i = 0; i < closes.length; i++) {
      if (closes[i] > highest) {
        highest = closes[i];
        stoploss = highest * (1 - trailingPercent / 100);
      }
    }
  
    // 5. Latest price/candle
    const latestIdx = cleanedData.length - 1;
    //const latestPrice = closes[latestIdx];
    const latestPrice = await fetchLatestPrice(symbol);
    const latestDate =
      cleanedData[latestIdx]?.datetime ||
      cleanedData[latestIdx]?.date ||
      null;
  
    return {
      trailingStop: stoploss,
      signal: latestPrice > stoploss ? "HOLD" : "SELL",
      price: latestPrice,
      entryIdx,
      date: latestDate,
    };
  }
  