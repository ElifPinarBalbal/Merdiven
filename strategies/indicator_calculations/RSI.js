/* 

RSI (Relative Strength Index) using NodeJS
- Arda

use the await indicatorRSI(symbol, option (1: 1day, 0: 15min), period, previousDay) function.
Period is 14 by default.

eg. indicatorRSI(AKBNK, 1, 14, 0) - latest daily RSI
indicatorRSI(AKBNK, 0, 14, 2) - RSI from 2 days ago; 15 min graphs.

*/

import { fetchChartData } from '../priceService.js';

async function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) {
    throw new Error(`Need at least ${period + 1} closing prices to calculate RSI.`);
  }

  const rsis = Array(period).fill(null); // pad first N values with null
  let gainSum = 0;
  let lossSum = 0;

  // Initial average gain/loss over first `period`
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gainSum += diff;
    else lossSum -= diff;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // First RSI value
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsis.push(100 - 100 / (1 + rs));

  // Loop through remaining data
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    // Wilder's smoothing formula
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsis.push(rsi);
  }

  return rsis;
}

/*

RSI Indicator - Matches with Tradingview
is an async function.

Built by Arda with love <3.

*/
export async function indicatorRSI(symbol, option = 1, period = 14, previousDay = 0) {

  const date = new Date();
  let prices = [];
  let closePrices;
  if (option === 0) {
    prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "60d", "15m");
  } else {
    prices = await fetchChartData(`${symbol}.IS`, `2024-01-01`, "1y", "1d");
  }
  //const swing = await fetchHistoricalData(`${symbol}.IS`, `${date.getFullYear() - 1}-${formatDate(date.getMonth() + 1)}-${formatDate(date.getDate())}`, `${date.getFullYear()}-${formatDate(date.getMonth() + 1)}-${formatDate(date.getDate())}`);

  //closePrices = prices.quotes.map(day => day.close);

  const filteredPrices = prices.quotes.filter(candle =>
    candle && candle.close != null && !isNaN(candle.close)
  );

  // Extract only close prices
  closePrices = filteredPrices.map(candle => candle.close);

  const rsiValues = await calculateRSI(closePrices, period);
  const latestRSI = rsiValues[rsiValues.length - (1 + previousDay)];

  return latestRSI;

}


// Comment when done
console.log("Latest RSI:", await indicatorRSI("ASELS", 0, 14, 0));