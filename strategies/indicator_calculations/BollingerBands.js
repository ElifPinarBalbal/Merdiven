/* 

Bollinger Bands strategy (indicator) using NodeJS
- Arda

use the await indicatorBB(symbol, (1: 1day, 0: 15-min graph), period, standard deviation, previous day)
Period is default 20, Standard Deviation 2, Previous Day is 0.

e.g. indicatorBB("AKBNK", 1, 20, 2, 0) - for AKBNK, 1 day graph, period 20, standard deviation 2 and latest day.

*/

import { fetchChartData } from '../priceService.js';


function calculateBollingerBands(closes, period = 20, factor = 2) {
  if (closes.length < period) {
    throw new Error(`Need at least ${period} closing prices.`);
  }

  const bands = Array(period - 1).fill(null); // pad initial output

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    

    const mean =
      slice.reduce((acc, val) => acc + val, 0) / period;

    const variance =
      slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;

    const stddev = Math.sqrt(variance);

    const upper = mean + factor * stddev;
    const lower = mean - factor * stddev;

    bands.push({
      middle: mean,
      upper: upper,
      lower: lower,
    });
  }

  return bands;
}

export async function indicatorBB(symbol, option = 1, period = 20, factor = 2, previousDay = 0) {


  const date = new Date();
  let prices = [];
  let closePrices;
  if (option === 0) {
    //prices = await fetchChartData(`${symbol}.IS`, `${format_DateOnly(date)}`, "5d", "15m");
    prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "60d", "15m");
  } else {
    prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "1y", "1d");
  }

  closePrices = prices.quotes.map(day => day.close);
  const cleaned = closePrices.filter(price => price != null);

  
  const BBValues = await calculateBollingerBands(cleaned, period, factor);
  const latestBB = BBValues[BBValues.length - (1 + previousDay)];

  return latestBB;

}

// Comment when done
console.log("Latest BB:", await indicatorBB("THYAO", 0, 20, 2, 0));