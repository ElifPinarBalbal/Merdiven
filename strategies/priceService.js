/*

Price fetching service for indicators.

Past BIST data is fetched through Yahoo Finance API (yahoo-finance2 unofficial api).
For the live data, AlgoLab's live data service is used through AlgoLab API. The live data's candles
are built through this live data, and fed at the end of the yahoo-finance candles.

*/


import yahooFinance from "yahoo-finance2";
import fs from "fs";
import path from "path";
import { fetchTVchartData } from "./TVpriceService.js";


/**
 * Fetch intraday chart data using yahoo-finance2
 * WARNING: DO NOT USE `period1` with `chart()` — just `range` + `interval`
 * @param {string} symbol - e.g., 'AKBNK.IS'
 * @param {string} range - e.g., '1d', '5d'
 * @param {string} interval - e.g., '5m', '15m'
 */
export async function fetchChartData(symbol, period1, range, interval) {


  try {
    const data = await yahooFinance.chart(symbol, {
    period1,
      range,
      interval
    });


    //fs.writeFileSync('./test.json', JSON.stringify(data.quotes, null, 2), 'utf-8');

    /*
    In trading hours, remove last 3 candles because:
    {
      date: 2025-05-09T10:13:19.000Z, <- NOT EVEN COMPLETED, why yahoo finance provides this? I dont know.
      high: 287.5,
      volume: 0,
      open: 287.5,
      low: 287.5,
      close: 287.5
    }
    {
      date: 2025-05-09T10:00:00.000Z, <- IS CHANGING CONSTANTLY: We already have a completed chart.
      high: 288.25,
      volume: 198532,
      open: 288,
      low: 287.25,
      close: 287.25
    }
      {
      date: 2025-05-09T09:45:00.000Z, <- SUPPOSED TO BE COMPLETED. (Although it does in a few seconds).
      ---------------------------------- Although the yahoo-finance API DOES NOT provide in precision.
      ---------------------------------- Thus we have switched to a TWO-STORE system for 15m interval.
      ---------------------------------- Even though this may be completed, it is safer that we build
      ---------------------------------- our candles ourselves.
      high: 288.25,
      volume: 198532,
      open: 288,
      low: 287.25,
      close: 287.25
    }


    THIS PART of the code checks if the interval requested is 15 minutes. And does
    3 things in particular:
    [1]: It clears up uncompleted candles, to avoid calculation mistakes for indicators.
    [2]: It adds up a synthetic 15-min candle for 15.00 (18.00 as UTC+3), made up of fetched
    daily interval data from Yahoo-Finance API. Because yahoo finance does not provide 15.00
    candles for some reason (i dont know). The synthehic candle's values are made up of "CLOSE"
    value of daily interval candles of daily fetch. The TradingView's 18.00 candles are flat candles
    made up of BIST's close date for that day.
    [3]: Adds up our BUILT candles. The last amount we built is 2.

    */
    if (interval == "15m") {

      const now = new Date();


      // Remove the first (volume=0) candle, because it is probably the latest price presented as a candle.
      const lastQuote = data.quotes[data.quotes.length - 1];
      if ((lastQuote.volume == null || lastQuote.volume === 0) && isSameDay(lastQuote.date, now)) {
        data.quotes.pop();
      }
  
      //const now = new Date();
      const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
      const istNow = new Date(utcNow.getTime() + 3 * 60 * 60 * 1000); // UTC+3
  
      const hour = istNow.getHours();
      const minute = istNow.getMinutes();
  
      const isTradingTime =
        (hour > 9 || (hour === 9 && minute >= 40)) &&
        (hour < 18 || (hour === 18 && minute <= 10));
  
      // --- Remove last two quotes only if in trading hours ---

      let secondremoved;
      const lastCandle = data.quotes[data.quotes.length - 1];

      if (isTradingTime && data.quotes.length >= 2) {

        if (lastCandle && isSameDay(lastCandle.date, now)) {
          data.quotes.pop();
        }

        // IF Yahoo failed to catch up with my fetch, I dont do anything. (I used to try to delete a 3rd!)
        /*
        So here, for example, I fetched at 7.30,
        Yahoo should have gave -> 7.15.01 (volume:null, last price candle), 7.15.00 (null), 7.00 (correct!)
        But instead, if Yahoo gave -> 7.14.59 (volume:null, last price candle), 7.00 (incorrect!!)
        I need to delete not 3, but 2 candles. (One I deleted at the beginning).
        */

      }

      // Step 2: Fetch the official daily close (for 18:00 patch)
      const dailyData = await yahooFinance.chart(symbol, {
        period1: '2024-01-01',
        range,
        interval: '1d',
      });

      const dailyCloses = dailyData.quotes.map(d => ({
        date: new Date(d.date),
        close: d.close,
      }));
      
      for (const { date, close } of dailyCloses) {
        const dateStr = date.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
        // Find 14:45 UTC candle for this day
        const index = data.quotes.findIndex(q => {
          const d = new Date(q.date);
          const dStr = d.toISOString().split('T')[0];
          return dStr === dateStr && d.getUTCHours() === 14 && d.getUTCMinutes() === 45;
        });
      
        if (index !== -1) {
          const patchTime = new Date(data.quotes[index].date);
          patchTime.setUTCMinutes(patchTime.getUTCMinutes() + 15); // move to 15:00 UTC
      
          const patchTimeISO = patchTime.toISOString();
      
          const alreadyExists = data.quotes.some(q => new Date(q.date).getTime() === patchTime.getTime());
      
          if (!alreadyExists) {
            const synthetic = {
              date: patchTimeISO,
              open: close,
              high: close,
              low: close,
              close: close,
              volume: 0,
            };
            data.quotes.splice(index + 1, 0, synthetic);
          }
        } else {
          //console.log(`❌ 14:45 candle missing for ${dateStr}, skipped patching.`);
        }
      }

      // STEP 3: Add built candles

      const baseSymbol = symbol.replace(/\.IS$/, '');
      const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000; // optional date filter


      const candlePath = path.join(process.cwd(), 'algolab/storage/15m-candles.json');
      let fileCandles = [];

      try {
        const jsonRaw = fs.readFileSync(candlePath, 'utf8');
        fileCandles = JSON.parse(jsonRaw);
      } catch (err) {
        console.log("❌ Failed to read built candles from JSON:", err.message);
      }

      const symbolCandles = fileCandles.filter(c =>
        c.symbol === baseSymbol && new Date(c.date).getTime() > cutoff
      );

      symbolCandles.sort((a, b) => new Date(a.date) - new Date(b.date)); // sorting. added for TWO-STORE system

      for (const c of symbolCandles) {
        const utcDate = new Date(c.date).toISOString();
    
        const alreadyExists = data.quotes.some(q => {
          return new Date(q.date).getTime() === new Date(utcDate).getTime();
        });
    
        if (!alreadyExists) {
          data.quotes.push({
            date: utcDate,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          });
        }
      }


    }
    
    //fs.writeFileSync('./test.json', JSON.stringify(data.quotes, null, 2), 'utf-8');

    // ✅ Create ./debug folder if it doesn't exist
    /*
    const debugDir = path.join(process.cwd(), 'debug');
    if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir);
    }

    // ✅ Get clean symbol name (e.g., THYAO from THYAO.IS)
    const baseSymbol = symbol.replace(/\.IS$/, '');

    // ✅ Save quotes to debug/[symbol].json
    const debugPath = path.join(debugDir, `${baseSymbol}.json`);
    fs.writeFileSync(debugPath, JSON.stringify(data.quotes, null, 2), 'utf-8');
    */

    // 🔎 NEW: Sanitize Yahoo quotes before returning
    data.quotes = sanitizeQuotes(data.quotes);

    return data;


  } catch (error) {

    console.log("Error fetching chart data:", symbol, error);
    console.log('Switching to backup TradingView fetching.');
    try {

      /*
      TradingView provides correct candles, for a requested range & timeframe.
      Although it also provides their indicators, because data is delayed for 15m,
      it is better if we just fetch the correct charts for now.
      (The token & signature expires every 4 months.)

      Because the data is correct:
      1. we will simply pop out the latest one (if we are within tradinghours)
      2. then we will insert our built candles.
      */

      if (interval == "15m") {

        const data = await fetchTVchartData(symbol, "15", 1000);

        const now = new Date();
    
        //const now = new Date();
        const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        const istNow = new Date(utcNow.getTime() + 3 * 60 * 60 * 1000); // UTC+3
    
        const hour = istNow.getHours();
        const minute = istNow.getMinutes();
    
        const isTradingTime =
          (hour > 9 || (hour === 9 && minute >= 40)) &&
          (hour < 18 || (hour === 18 && minute <= 10));
    
        // --- Remove last quote only if in trading hours --- (Same as Yahoo Fetch)

        const lastCandle = data[data.quotes.length - 1];
  
        if (isTradingTime && data.quotes.length >= 2) {
          if (lastCandle && isSameDay(lastCandle.date, now)) {
            data.quotes.pop();
          }
        }

        // STEP 2: Add built candles

        const baseSymbol = symbol.replace(/\.IS$/, '');
        const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000; // optional date filter

        const candlePath = path.join(process.cwd(), 'algolab/storage/15m-candles.json');
        let fileCandles = [];

        try {
          const jsonRaw = fs.readFileSync(candlePath, 'utf8');
          fileCandles = JSON.parse(jsonRaw);
        } catch (err) {
          console.log("❌ Failed to read built candles from JSON:", err.message);
        }

        const symbolCandles = fileCandles.filter(c =>
          c.symbol === baseSymbol && new Date(c.date).getTime() > cutoff
        );

        symbolCandles.sort((a, b) => new Date(a.date) - new Date(b.date)); // sorting. added for TWO-STORE system

        for (const c of symbolCandles) {
          const utcDate = new Date(c.date).toISOString();
      
          const alreadyExists = data.quotes.some(q => {
            return new Date(q.date).getTime() === new Date(utcDate).getTime();
          });
      
          if (!alreadyExists) {
            data.quotes.push({
              date: utcDate,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            });
          }
        }

        return data;

      }


    } catch (err) {
      console.log("Error fetching chart data (from TV as well):", symbol, err);
    }
  }

}



// This is added for the morning checks.
// Because we were probably deleting yahoo candles that were from previous day. - Arda
/*
Here is the explanation:
Time (UTC) / Yahoo / AlgoLab WSS Live Data
At 6.45 - Only 15.45 (from last day) - No data
At 6.55 - Still only 15.45 (last day) - * Exact matched trades come in at 6.55.
[Not 100% Sure] At 7.00 - Still 15.45 (last day), NO 6.30 or 6.45 (because it hasnt even started building it due to 15m delay) - Live trading starts.
At 7.10 - 14.45 + 6.30 (With all null, why now, I dont know) + 6.45 (because it started to build) + 6.55 (volume: 0, last price candle) - Live trading.
At 7.15  - 14.45 + 6.30 + 6.45 - 6.55 (ITS GONE NOW!) + 7.00 (started to build) + 7.00.01 (volume: 0, last price candle) - Live trading
...

So the problem was that:
At 7.15 fetch, we are deleting last two candles (7.00 and 7.00.01), as intended. And it works.
But at 7.00 fetch, we were deleting 15.45 (and maybe 15.30 too) from last day!

Now the solution is: To check the day of the candle we are about the delete, if its WITHIN THE SAME DAY TODAY.
*/
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}


// ✅ Sanitization helper (NEW)
function sanitizeQuotes(quotes) {
  const out = [];
  let dropped = 0;
  for (const p of quotes || []) {
    const op = +p.open, hi = +p.high, lo = +p.low, cl = +p.close, vo = +p.volume;
    if (!isFinite(op) || !isFinite(hi) || !isFinite(lo) || !isFinite(cl) || !isFinite(vo) || cl === 0) {
      dropped++;
      continue;
    }
    if (hi < lo || cl < lo || cl > hi) {
      dropped++;
      continue;
    }
    out.push({ date: p.date, open: op, high: hi, low: lo, close: cl, volume: vo });
  }
  return out;
}