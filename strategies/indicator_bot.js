/*
This is the indicator bot that calls all indicators in each 15 minutes.

As of 02.07.25, it also checks for Trailing Stoploss indicator at a 3% parameter, for every minute.
Also, news can cause a bypass for indicator checks for a duration. (but not trailing stoploss)!

Currently it follows BIST 100.
*/

//import { indicatorRSI } from "./RSI.js";
import fs from 'fs';
import path from 'path';

import { indicatorBB } from "./indicator_calculations/BollingerBands.js";
import { indicatorStochastic } from "./indicator_calculations/Stochastic.js";
import { indicatorTrailingStopFromEntryDate } from './TrailingStoploss.js'; 

import { simulationGetPortfolio } from '../simulation/lib/simulationService.js';
import { liveGetLastBuyDate, liveGetPortfolio } from '../algolab/portfolio/lib/portfolioService.js';

import { SimulationBot_Buy, SimulationBot_BuyNotify, SimulationBot_Bypass, SimulationBot_CriticalHaltSellAll, SimulationBot_Sell, SimulationBot_SellNotify } from "../bot_main/lib/simulationbot.js";
import { LiveBot_Buy, LiveBot_BuyNotify, LiveBot_Bypass, LiveBot_CriticalHaltSellAll, LiveBot_Sell, LiveBot_SellNotify } from '../bot_main/lib/livebot.js';

import { fetchLatestPrice } from "../algolab/livePrice.js";

import { candleEvents } from "../misc/events.js";

import { addBypass, isBypassed } from "../news_main/bypass/bypass.js";

import Database from 'better-sqlite3';
import { isBISTopen } from '../misc/bistStatus.js';
import { indicatorRSI } from './indicator_calculations/RSI.js';
import { formatDateForTS } from '../misc/dateFormats.js';


const dbPath = process.env.IS_LIVE ? './portfolio.db' : './simulation.db';
const db = new Database(dbPath);


/* Top 100 BIST company
const BIST100 = [
  "AEFES", "AGHOL", "AKBNK", "AKSA", "AKSEN", "ALARK", "ALFAS", "ALTNY", "ANSGR", "ARCLK",
  "ASELS", "ASTOR", "AVPGY", "BALSU", "BERA", "BIMAS", "BINHO", "BRSAN", "BRYAT", "BSOKE",
  "BTCIM", "CANTE", "CCOLA", "CIMSA", "CLEBI", "CWENE", "DOAS", "DOHOL", "DSTKF", "EFORC",
  "EGEEN", "EKGYO", "ENERY", "ENJSA", "ENKAI", "EREGL", "EUPWR", "FENER", "FROTO", "GARAN",
  "GENIL", "GESAN", "GLRMK", "GRSEL", "GRTHO", "GSRAY", "GUBRF", "HALKB", "HEKTS", "IEYHO",
  "IPEKE", "ISCTR", "ISMEN", "KCAER", "KCHOL", "KONTR", "KOZAA", "KOZAL", "KRDMD", "KTLEV",
  "KUYAS", "LMKDC", "MAGEN", "MAVI", "MGROS", "MIATK", "MPARK", "OBAMS", "ODAS", "OTKAR",
  "OYAKC", "PASEU", "PETKM", "PGSUS", "RALYH", "REEDR", "SAHOL", "SASA", "SISE", "SKBNK",
  "SMRTG", "SOKM", "TABGD", "TAVHL", "TCELL", "THYAO", "TKFEN", "TOASO", "TSKB", "TTKOM",
  "TTRAK", "TUPRS", "TUREX", "TURSG", "ULKER", "VAKBN", "VESTL", "YEOTK", "YKBNK", "ZOREN"
];
*/

// BIST-50 companies
const BIST50 = ["AKBNK","ALARK","AEFES","ARCLK","ASELS","ASTOR","BIMAS","BRSAN","CCOLA","CIMSA","DSTKF","DOHOL","DOAS","EKGYO","ENKAI","EREGL","FROTO","GUBRF","SAHOL","HEKTS","KRDMD","KCHOL","KONTR","KOZAL","KOZAA","KUYAS","MAVI","MIATK","MGROS","OYAKC","PGSUS","PETKM","SASA","SOKM","TAVHL","TKFEN","TOASO","TCELL","TUPRS","THYAO","GARAN","HALKB","ISCTR","TSKB","SISE","VAKBN","TTKOM","ULKER","VESTL","YKBNK"]


// Candles are ready event for 15 minute candles.
candleEvents.on('15mcandlesReady', async () => {
  console.log("📡 Candles ready! Running indicators...");
  await checkIndicators();
});



// Indicator Bot function
async function checkIndicators() {
    console.clear();
    console.log(`📊 Indicator Check @ ${new Date().toLocaleTimeString()}\n`);

    let portfolio;
    (process.env.IS_LIVE) ? portfolio = await liveGetPortfolio() : portfolio = await simulationGetPortfolio();
    console.log(portfolio.rawData.positions);
    const ownedSymbols = new Set(portfolio.rawData.positions.map(pos => pos.symbol));

    console.log("📦 Owned Symbols:", [...ownedSymbols].join(", ") || "None");
    console.log(""); // Empty line for readability

    const symbolsToCheck = new Set(BIST50);
    // Iterate over ownedSymbols and add any missing ones to symbolsToCheck
    ownedSymbols.forEach(symbol => {
        if (!symbolsToCheck.has(symbol)) {
            symbolsToCheck.add(symbol);
        }
    });

    // If you need symbolsToCheck as an array:
    const symbolsToCheckArray = Array.from(symbolsToCheck);

    let buycounter = 0; // see below - bearish market attitude
  
    for (const symbol of symbolsToCheckArray) {   
      try {
        const [bb, bbPrev, stochNow, stochPrev, rsi, closePriceLive] = await Promise.all([
          indicatorBB(symbol, 0, 20, 2, 0),
          indicatorBB(symbol, 0, 20, 2, 1), //1 candle before
          indicatorStochastic(symbol, 0, 14, 1, 3, 0), // current
          indicatorStochastic(symbol, 0, 14, 1, 3, 1), // 1 candle before
          indicatorRSI(symbol, 0, 14, 0),
          fetchLatestPrice(symbol)
        ]);        

        let closePrice;
        try {
          closePrice = getLastBuiltClose(symbol);
        } catch (err) {
          closePrice = closePriceLive;
        }
  
        // For displaying I used toFixed(2) for rounding into 2 digits after decimal..
        // Tamamen kaldırıp tüm digitleri de görebilirsin.

        console.log(`🔹 ${symbol}`);
        //console.log(`   RSI: ${rsi.toFixed(2)}`);
        console.log(`   BB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}`);
        console.log(`   PrevBB:  upper ${bbPrev.upper.toFixed(2)}, middle ${bbPrev.middle.toFixed(2)}, lower ${bbPrev.lower.toFixed(2)}`);
        console.log(`   Stoch: %K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n`);
        console.log(`   PrevStoch: %K ${stochPrev.percentK.toFixed(2)}, %D ${stochPrev.percentD.toFixed(2)}\n`);
        console.log(`   RSI: %K ${rsi.toFixed(2)}\n`);
        console.log(`   Live Price: ${closePriceLive}\n   Close Price: ${closePrice}`);

        // Extract values
        const { percentK: K, percentD: D } = stochNow;
        const { percentK: prevK, percentD: prevD } = stochPrev;

        // Crossover detection
        const kCrossesAboveD = prevK < prevD && K > D;
        const kCrossesBelowD = prevK > prevD && K < D;

        // BUY: Clear %K > %D crossover from below + rebound from lower BB
        const isBuy = (
          (((kCrossesAboveD) && ((closePrice <= bb.lower) || (closePrice <= bbPrev.lower)) && prevK <= 20 && prevD <= 20)
          || ((closePrice <= bb.lower))) &&
          !ownedSymbols.has(symbol)
        );

        // SELL: Clear %K < %D crossover from above + pullback from upper BB
        const isSell = (
          (((kCrossesBelowD) && ((closePrice >= bb.upper) || (closePrice >= bbPrev.upper)) && prevK >= 80 && prevD >= 80)
          || ((closePrice >= bb.upper))) &&
          ownedSymbols.has(symbol)
        );

        if (isSell && ownedSymbols.has(symbol)) {
            console.log(`🔺 SELL SIGNAL for ${symbol}!\n`);
            (process.env.IS_LIVE) ?
            ((!isBypassed(symbol)) ? LiveBot_Sell({symbol: symbol, time: 1}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`}) : LiveBot_SellNotify({symbol: symbol}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`})) :
            ((!isBypassed(symbol)) ? SimulationBot_Sell({symbol: symbol, time: 1}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`}) : SimulationBot_SellNotify({symbol: symbol}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`}));
        } else if (isBuy && !ownedSymbols.has(symbol)) {
            console.log(`🟢 BUY SIGNAL for ${symbol}!\n`);
            (process.env.IS_LIVE) ?
            ((!isBypassed(symbol)) ? LiveBot_Buy({symbol: symbol, time: 1}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`}) : LiveBot_BuyNotify({symbol: symbol}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`})) :
            ((!isBypassed(symbol)) ? SimulationBot_Buy({symbol: symbol, time: 1}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`}) : SimulationBot_BuyNotify({symbol: symbol}, {reason: 'Bollinger Bands + Stochastic', reasonText: `<i>Current / 1-before / 2-before / 5-before\n\nBB:  upper ${bb.upper.toFixed(2)}, middle ${bb.middle.toFixed(2)}, lower ${bb.lower.toFixed(2)}\n\%K ${stochNow.percentK.toFixed(2)}, %D ${stochNow.percentD.toFixed(2)}\n</i>`}));
            buycounter++;
        } else {
            console.log(`⚪ No signal.\n`);
        }
      } catch (err) {
        console.log(`❌ Error fetching data for ${symbol}:`, err.message);
      }
    }

    // IF RSI + BB BUY SIGNALs reached over 30, critical halt.
    /*
    if (buycounter >= 30) {
      // CANCEL OUT ALL CURRENTLY ACTIVE ORDERS.
      if (process.env.IS_LIVE) {
        LiveBot_Bypass({duration, tone: 'BEARISH'}, {reason: `Indicator Bot - Overall Buy Notice`, reasonText: `<i>It seems that we have received more than <b>30 BUY signals</b> for our indicator check.</i>\n\nThis shows that there is an overall sharp decrease in BIST stock prices.\n\nIt may be best to sell all positions and shutdown the bot for some time.`});
        LiveBot_CriticalHaltSellAll({time: 15}, {reason: `Indicator Bot - Overall Buy Notice`, reasonText: `<i>It seems that we have received more than <b>30 BUY signals</b> for our indicator check.</i>\n\nThis shows that there is an overall sharp decrease in BIST stock prices.\n\nIt may be best to sell all positions and shutdown the bot for some time.`});
      } else {
        SimulationBot_Bypass({duration, tone: 'BEARISH'}, {reason: `Indicator Bot - Overall Buy Notice`, reasonText: `<i>It seems that we have received more than <b>30 BUY signals</b> for our indicator check.</i>\n\nThis shows that there is an overall sharp decrease in BIST stock prices.\n\nIt may be best to sell all positions and shutdown the bot for some time.`});
        SimulationBot_CriticalHaltSellAll({time: 15}, {reason: `Indicator Bot - Overall Buy Notice`, reasonText: `<i>It seems that we have received more than <b>30 BUY signals</b> for our indicator check.</i>\n\nThis shows that there is an overall sharp decrease in BIST stock prices.\n\nIt may be best to sell all positions and shutdown the bot for some time.`});
      }
    }
    */
}

// To get the CLOSE value of latest built candle.
function getLastBuiltClose(symbol) {
  const baseSymbol = symbol.replace(/\.IS$/, ''); // is this even needed? - maybe delete later
  const candlePath = path.join(process.cwd(), 'algolab/storage/15m-candles.json');
  
  try {
    const jsonRaw = fs.readFileSync(candlePath, 'utf8');
    const allCandles = JSON.parse(jsonRaw);

    const symbolCandles = allCandles
      .filter(c => c.symbol === baseSymbol)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (symbolCandles.length === 0) return null;

    return symbolCandles[symbolCandles.length - 1].close;

  } catch (err) {
    console.log(`❌ getLastBuiltClose(${symbol}) failed:`, err.message);
    return null;
  }
}


async function checkTrailingStoploss(symbol) {
  
  const lastBuyDate = liveGetLastBuyDate(symbol);

  if (lastBuyDate) {
    const result = await indicatorTrailingStopFromEntryDate(symbol, lastBuyDate);
    //console.log(lastBuyDate);
    //console.log(`📉 [${symbol}] Trailing Stop Result:`, result);
    if (result.signal === 'SELL') {
      console.log(`🔺 SELL SIGNAL for ${symbol}!\n`);
      const formattedDate = formatDateForTS(lastBuyDate);
      (process.env.IS_LIVE) ?
      LiveBot_Sell({symbol: symbol, time: 1, priority: 9}, {reason: 'Trailing Stoploss', reasonText: `<i>This symbol was bought at: <b>${formattedDate}</b>\nTrailing Stoploss limit was: <b>${result.trailingStop}</b></i>`}) :
      SimulationBot_Sell({symbol: symbol, time: 1}, {reason: 'Trailing Stoploss', reasonText: `<i>This symbol was bought at: <b>${formattedDate}</b>\nTrailing Stoploss limit was: <b>${result.trailingStop}</b></i>`});
      addBypass(symbol, 8); // add bypass to the symbol for 8 hours.
    }
  }
  else {
    console.log("Error in trailing stoploss calculation lastbuydate is invalid", symbol);
  }
}

function TrailingStopLoop() {
  const run = async () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    //console.log(now, hour, day);

    // Check if BIST is open or not
    const bistStatus = await isBISTopen();

    if (!bistStatus.isOpen) {
      return;
    }

    try {

      let portfolio;
      (process.env.IS_LIVE) ? portfolio = await liveGetPortfolio() : portfolio = await simulationGetPortfolio();
      let positions = portfolio.rawData.positions.map(position => position.symbol);

      if (!Array.isArray(positions) || positions.length === 0) {
        console.log('📭 No active positions found in portfolio.');
        return; //exit this run
      }
      
      for (const symbol of positions) {
        if (symbol) {
          await checkTrailingStoploss(symbol);
        }
      }

    } catch (err) {
      console.log('❌ Error in trailing stop check:', err.message);
    }
  };

  const alignToNextMinute = () => {
    const now = new Date();
    const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    setTimeout(() => {
      run(); // first call
      setInterval(run, 60000); // repeat every minute
    }, delay);
  };

  alignToNextMinute();
}

TrailingStopLoop();