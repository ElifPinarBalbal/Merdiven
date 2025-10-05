/*

ATR Stoploss strategy with NodeJS - by Arda with lovee
(Tradingview Public Indicators - by ceyhun)

This indicator is an alternated trailing stoploss, where it sets up a
stoploss point while also considering price fluctuations to set up a realistic
point.

Should be activated upon 20 CANDLES AT MINIMUM when a stock is bought.
Otherwise, profit might be lost.

Call await indicatorATRStoploss(symbol, option = 0, Atr = 5, Hhv = 10, Mult = 2.5, previousDay = 0)

indicatorATRStoploss("THYAO", 0, 5, 10, 2.5, 0)

*/

import { fetchChartData } from "../priceService.js";

// The ATR (Average True Range) calculation (by GPT)
function ATR(high, low, close, period) {
    const tr = [];
    for (let i = 1; i < close.length; i++) {
      const range1 = high[i] - low[i];
      const range2 = Math.abs(high[i] - close[i - 1]);
      const range3 = Math.abs(low[i] - close[i - 1]);
      tr.push(Math.max(range1, range2, range3));
    }
    const atr = [];
    for (let i = 0; i < tr.length; i++) {
      if (i < period) {
        atr.push(null);
      } else {
        const sum = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
      }
    }
    // Pad ATR to length of price array (first value is null)
    return [null].concat(atr);
}


// The Highest High Value (HHV) calculation by GPT
function HHV(values, period) {
    const result = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        result.push(Math.max(...values.slice(i - period + 1, i + 1)));
      }
    }
    return result;
}


function ATRStoploss(high, low, close, opt = { Atr: 5, Hhv: 10, Mult: 2.5 }) {
    const { Atr, Hhv, Mult } = opt;
    const atr = ATR(high, low, close, Atr);
    const highestArr = [];
  
    for (let i = 0; i < close.length; i++) {
      if (atr[i] == null) {
        highestArr.push(null);
        continue;
      }
      highestArr.push(high[i] - Mult * atr[i]);
    }
  
    const prev = HHV(highestArr, Hhv);
  
    const TS = [];
    let cum_1 = 0;
    for (let i = 0; i < close.length; i++) {
      cum_1++;
      if (cum_1 < 16) {
        TS.push(close[i]);
      } else {
        const iff_1 = (close[i] > prev[i] && close[i] > close[i - 1]) ? prev[i] : prev[i];
        TS.push(iff_1);
      }
    }
  
    // Buy/Sell signals
    const signals = [];
    for (let i = 1; i < close.length; i++) {
      if (TS[i-1] == null || TS[i] == null) {
        signals.push(null);
        continue;
      }
      if (close[i-1] < TS[i-1] && close[i] > TS[i]) {
        signals.push('BUY');
      } else if (close[i-1] > TS[i-1] && close[i] < TS[i]) {
        signals.push('SELL');
      } else {
        signals.push(null);
      }
    }
    signals.unshift(null); // First index has no signal
    return { TS, signals };
}
  
  
// The indicator function to be exported

export async function indicatorATRStoploss(symbol, option = 0, Atr = 5, Hhv = 10, Mult = 2.5, previousDay = 0) {
    const date = new Date();
    let prices = [];
    if (option === 0) {
        // 15m data
        prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "60d", "15m");
    } else {
        // 1d data
        prices = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "1y", "1d");
    }

    let pricedata = prices.quotes;

    // Clean nulls
    const cleanedData = [];
    let lastValid = { high: null, low: null, close: null };
    for (const d of pricedata) {
        const isGhost = [d.open, d.high, d.low, d.close].every(v => v == null);
        if (isGhost) continue;
        const high = d.high != null ? d.high : lastValid.high;
        const low = d.low != null ? d.low : lastValid.low;
        const close = d.close != null ? d.close : lastValid.close;
        if (high != null && low != null && close != null) {
            const filled = { ...d, high, low, close };
            cleanedData.push(filled);
            lastValid = { high, low, close };
        }
    }

    // Feed arrays to ATRStoploss
    const highArr = cleanedData.map(d => d.high);
    const lowArr = cleanedData.map(d => d.low);
    const closeArr = cleanedData.map(d => d.close);

    const { TS, signals } = ATRStoploss(highArr, lowArr, closeArr, { Atr, Hhv, Mult });

    // Choose the latest or Nth previous
    const idx = TS.length - 1 - previousDay;
    return {
        trailingStop: TS[idx],
        signal: signals[idx], // 'BUY', 'SELL', or null
        price: closeArr[idx],
        date: cleanedData[idx]?.datetime || cleanedData[idx]?.date || null // adjust field as needed
    };
}

