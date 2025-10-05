/*

Stochastic (Oscillator) using JS
by Arda with love :) <3
(TradingView replicate)

use await indicatorStochastic(symbol, option (1=swing, 0=intraday), periodK, smoothK, periodD, previous day).
Default values are:
periodK - 14,
smoothK - 1,
periodD - 3
await indicatorStochastic("AKBNK", 1, 14, 1, 3, 0) - Get stochastic for AKBNK for swing.

*/

import { fetchChartData } from '../priceService.js';

function calculateStochasticOscillator(data, periodK = 14, smoothKPeriod = 1, periodD = 3) {
  if (data.length < periodK + smoothKPeriod + periodD - 2) {
    throw new Error('Insufficient data to calculate Stochastic Oscillator.');
  }

  

  const rawKs = [];

  for (let i = periodK - 1; i < data.length; i++) {
    const window = data.slice(i - periodK + 1, i + 1);
    const highs = window.map(d => d.high);
    const lows = window.map(d => d.low);
    const currentClose = data[i].close;

    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);

    const rawK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    rawKs.push({ date: data[i].date, value: rawK });
  }
  


  const smoothedKs = [];
  for (let i = smoothKPeriod - 1; i < rawKs.length; i++) {
    const slice = rawKs.slice(i - smoothKPeriod + 1, i + 1).map(d => d.value);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    smoothedKs.push({ date: rawKs[i].date, value: avg });
  }

  const final = [];
  for (let i = periodD - 1; i < smoothedKs.length; i++) {
    const slice = smoothedKs.slice(i - periodD + 1, i + 1).map(d => d.value);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    final.push({
      date: smoothedKs[i].date,
      percentK: smoothedKs[i].value,
      percentD: avg
    });
  }

  return final;
}

// The indicator function to be exported

export async function indicatorStochastic(symbol, option = 1, periodK = 14, smoothK = 1, periodD = 3, previousDay = 0) {

    const date = new Date();
    let prices = [];
    if (option === 0) {
       // prices = await fetchChartData(`${symbol}.IS`, `${format_DateOnly(date)}`, "5d", "15m");
      prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "60d", "15m");
    } else {
      prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "1y", "1d");
    }

    //pricedata = prices.quotes.map(day => day.close);
    let pricedata = prices.quotes;
    

    // this was to remove null values 

    const cleanedData = [];
    let lastValid = { high: null, low: null, close: null };

    for (const d of pricedata) {
      // Check if it's a ghost candle (all fields null)
      const isGhost = [d.open, d.high, d.low, d.close].every(v => v == null);
      if (isGhost) continue; // skip like TradingView
    
      const high = d.high != null ? d.high : lastValid.high;
      const low = d.low != null ? d.low : lastValid.low;
      const close = d.close != null ? d.close : lastValid.close;
    
      if (high != null && low != null && close != null) {
        const filled = { ...d, high, low, close };
        cleanedData.push(filled);
        lastValid = { high, low, close };
      }
    }
  

    const StochasticValues = await calculateStochasticOscillator(cleanedData, periodK, smoothK, periodD);
    const latestSV = StochasticValues[StochasticValues.length - (1 + previousDay)];
    //checkMissingCandles(cleanedData);

    return latestSV;

}