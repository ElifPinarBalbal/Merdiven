/*

This is the PHANTOM DATABASE MANAGER for ALGOLAB Banking database integration.


*/

import path from 'path';
import sqlite3 from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { fetchLatestPrice } from '../../livePrice.js';
import { placeNewOrder } from '../connectQueues.js';
import { formatDateForPortfolio } from '../../../misc/dateFormats.js';
import { addBypass } from '../../../news_main/bypass/bypass.js';
import { isBISTopen } from '../../../misc/bistStatus.js';
import { fetchChartData } from '../../../strategies/priceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.resolve(__dirname, '../../../portfolio.db');
const db = new sqlite3(dbPath);

let cashSynced;

function loadOrders() {
  const ordersPath = path.resolve(__dirname, '../../storage/orders.json');
  let rawOrders = [];

  try {
    const content = fs.readFileSync(ordersPath, 'utf-8').trim();
    if (!content) return [];
    rawOrders = JSON.parse(content);
  } catch (err) {
    return [];
  }

  return rawOrders;
}

function liveGetCash() {
  const realCash = db.prepare("SELECT balance FROM cash WHERE id = 1").get().balance;
  const orders = loadOrders();

  let pendingChange = 0;

  for (const o of orders) {

    // If refCode is NOT 0 or 1, then the order has been given a refCode.
    // This means that AlgoLab (DenizBank) BLOCKED THE CASH. We handle this by directly modifying the database.
    /*
    When you sell something outside trading hours - tradelimit is not added or updated by AlgoLab (it stays same).
    BUT when you buy something (outside trading hours) - tradelimit is UPDATED (DECREASED) by AlgoLab.
    (this logic also applies to stocks - when you sell, stock is DELETED - but when you buy, stocks stay same (not updated))
    */
    if (o.refCode !== "0" && o.refCode !== "1" && o.refCode !== "2"
      && (new Date(o.transactionDate) <= cashSynced)) continue;

    const value = o.quantity * o.price;

    if (o.operation === 'BUY') {
      pendingChange -= value; // reduces cash
    } else if (o.operation === 'SELL') {
      pendingChange += value; // increases cash
    }
  }

  return Math.max(0, realCash + pendingChange);
}


function liveGetStock(symbol) {
  const orders = loadOrders().filter(order => order.symbol === symbol);
  const real = db.prepare("SELECT * FROM portfolio WHERE symbol = ?").get(symbol) || { quantity: 0, avgPrice: 0 };

  let quantity = real.quantity;
  let totalCost = real.avgPrice * real.quantity;

  for (const order of orders) {
    const q = order.quantity;
    const p = order.price;

    if (order.operation === 'BUY') {
      totalCost += q * p;
      quantity += q;
    } else if (order.operation === 'SELL') {
      quantity -= q;
      if (quantity < 0) quantity = 0;
    }
  }

  const avgPrice = quantity > 0 ? totalCost / quantity : 0;
  return { symbol, quantity, avgPrice };
}

function liveGetCashRaw() {
  const row = db.prepare("SELECT balance FROM cash WHERE id = 1").get();
  return row ? parseFloat(row.balance) : 0;
}

function liveGetStockRaw(symbol) {
  return db.prepare("SELECT * FROM portfolio WHERE symbol = ?").get(symbol);
}

function liveUpdateCash(amount) {
  db.prepare("UPDATE cash SET balance = ? WHERE id = 1").run(amount);
}

function liveUpdateStock(symbol, quantity, avgPrice) {
  db.prepare(`
    INSERT INTO portfolio (symbol, quantity, avgPrice)
    VALUES (?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      quantity = excluded.quantity,
      avgPrice = excluded.avgPrice
  `).run(symbol, quantity, avgPrice);
}

function liveAddTransaction(type, symbol, quantity, price) {
  db.prepare(`
    INSERT INTO transactions (type, symbol, quantity, price, date)
    VALUES (?, ?, ?, ?, ?)
  `).run(type, symbol, quantity, price, new Date().toISOString());
}

function liveGetLastBuyDate(symbol) {
  // If date is stored as ISO-8601 strings, ORDER BY date is fine.
  // If unsure, use ORDER BY datetime(date) to be safe.
  const rows = db.prepare(`
    SELECT type, quantity, date
    FROM transactions
    WHERE symbol = ?
    ORDER BY date
  `).all(symbol);

  let holding = 0;
  let lastBuyDate = null;

  for (const row of rows) {
    if (row.type === 'BUY') {
      holding += row.quantity;
      lastBuyDate = row.date;   // last time we added to the current open position
    } else if (row.type === 'SELL') {
      holding -= row.quantity;
      if (holding <= 0) {
        holding = 0;
        lastBuyDate = null;     // fully sold out → reset
      }
    }
  }

  return lastBuyDate; // null if flat
}

async function liveBuyStock(symbol, quantity) {
  const price = await fetchLatestPrice(symbol);
  if (!price) return { success: false, msg: `❌ Couldn't fetch price for ${symbol}` };

  const totalCost = quantity * price;
  const currentCash = liveGetCash();

  if (currentCash < totalCost) {
    return { success: false, msg: `❌ Not enough cash. Needed: ${totalCost.toFixed(2)} TRY, Available: ${currentCash.toFixed(2)} TRY` };
  }

  const stock = liveGetStock(symbol);
  const newQuantity = stock.quantity + quantity;
  const newAvgPrice = ((stock.avgPrice * stock.quantity) + totalCost) / newQuantity;

  //liveUpdateStock(symbol, newQuantity, newAvgPrice);
  //liveUpdateCash(currentCash - totalCost);
  liveAddTransaction('BUY', symbol, quantity, price);
  placeNewOrder({ symbol, operation: 'BUY', quantity, price, priority });

  return { success: true, msg: `✅ Bought ${quantity} x ${symbol} @ ${price.toFixed(2)} TRY` };
}


/* EXTRA CASH LIMIT CHECK FOR ALGOLAB

We are giving our orders using "piyasa", not "limit", which cause the price to be unknown.
AlgoLab BLOCKS ENOUGH CASH TO AFFORD CEILING FOR THAT SYMBOL.
Yani tavan fiyatında CASH olması gerekiyor. Burada afford edebileceğimiz quantityi buna göre
hesaplamamız lazım.

Son olarak tavan fiyatı -> Bir önceki günün CLOSE değerinden hesaplanıyor. Yani bugünün OPENING değerinden değil.
*/
async function liveGetCeilingFloor(symbol) {
  let candles = await fetchChartData(`${symbol}.IS`, `2024-05-01`, "10d", "1d");
  if (!candles?.quotes?.length) {
    console.log("No price data returned");
    return { success: false, msg: `❌ Failed fetch for ${symbol}.` };
  }
  candles = candles.quotes;

  const { isOpen } = await isBISTopen();

  let lastFullDay;
  if (isOpen) {
    lastFullDay = candles[candles.length - 2];
  } else {
    lastFullDay = candles[candles.length - 1];
  }

  const lastclose = lastFullDay.close;
  const ceiling = (lastclose * 1.095);
  const floor = (lastclose * 0.905);

  console.log(ceiling, floor);

  return {
    symbol,
    date: lastFullDay.date,
    lastclose,
    ceiling,
    floor
  };
}

async function liveCalculateBuyQuantity(symbol, priceLimit, ghostCash = 0, addUp = false) {
  let price = await fetchLatestPrice(symbol);
  let { ceiling } = await liveGetCeilingFloor(symbol);

  if (typeof price !== 'number' || price <= 0) {
    return { success: false, msg: `❌ Invalid price for ${symbol}: ${price}` };
  }
  if (typeof ceiling !== 'number' || ceiling <= 0) {
    return { success: false, msg: `❌ Invalid ceiling for ${symbol}: ${ceiling}` };
  }

  // If you ever want to bias cash by market status, re-enable this:
  // let extraMultiplier = (await isBISTopen()).isOpen ? 0.98 : 0.9;
  let extraMultiplier = 1;

  const currentCash = (await liveGetCash() * extraMultiplier) + ghostCash;

  // 1) How many shares can we afford *right now* if we submit at `ceiling`?
  let affordableNow = 0;
  while (true) {
    const nextCost = (affordableNow + 1) * ceiling;
    if (nextCost > currentCash) break;

    // Respect priceLimit with your "half-step grace" rule
    const exceeds = nextCost > priceLimit;
    const valid = !exceeds || (nextCost - priceLimit <= ceiling / 2);
    if (!valid) break;

    affordableNow++;
  }

  // Fast return if we’re not doing add-up logic
  if (!addUp) {
    return { success: true, quantityToBuy: affordableNow };
  }

  // 2) When addUp=true, cap by "maximum position size" implied by full BUY_LIMIT
  //    i.e., the maximum *total* shares allowed by your `priceLimit` rule.
  //    Using the same half-step grace: floor((priceLimit + ceiling/2) / ceiling)
  const maxByLimit = Math.floor((priceLimit + ceiling / 2) / ceiling);

  // 3) Subtract the shares you already hold
  const { quantity } = await liveGetStock(symbol);
  const remainingToCap = Math.max(0, maxByLimit - quantity);

  // 4) Final quantity is the min of what you can afford now, and what's left to reach the cap
  const quantityToBuy = Math.min(affordableNow, remainingToCap);
  console.log(quantityToBuy);

  return { success: true, quantityToBuy };
}

async function liveBuyStockUpToLimit(symbol, priceLimit, priority = 0) {
  if (typeof priceLimit !== 'number' || priceLimit <= 0) {
    return { success: false, msg: `❌ Invalid price limit.` };
  }

  const price = await fetchLatestPrice(symbol);
  if (typeof price !== 'number' || price <= 0) {
    return { success: false, msg: `❌ Invalid price for ${symbol}` };
  }

  const currentCash = liveGetCash();
  const { quantityToBuy } = await liveCalculateBuyQuantity(symbol, priceLimit);
  const finalCost = (quantityToBuy * price) * 1.0025;

  if (quantityToBuy === 0) {
    return { success: false, msg: `❌ Cannot buy any ${symbol} shares under limit.` };
  }

  const stock = liveGetStock(symbol);
  const newQuantity = stock.quantity + quantityToBuy;
  const newAvgPrice = ((stock.avgPrice * stock.quantity) + finalCost) / newQuantity;

  //liveUpdateStock(symbol, newQuantity, newAvgPrice);
  //liveUpdateCash(currentCash - finalCost);
  liveAddTransaction('BUY', symbol, quantityToBuy, price);
  await placeNewOrder({ symbol, operation: 'BUY', quantity: quantityToBuy, price, priority });

  return { success: true, msg: `✅ Bought ${quantityToBuy} x ${symbol} @ ${price.toFixed(2)} TRY (Total: ${finalCost.toFixed(2)} TRY)` };
}

async function liveSellStock(symbol, quantity, priority = 0) {
  const stock = liveGetStock(symbol);
  if (!stock || stock.quantity < quantity) {
    return { success: false, msg: `❌ Not enough shares to sell. You have ${stock?.quantity || 0}` };
  }

  const price = await fetchLatestPrice(symbol);
  if (!price) return { success: false, msg: `❌ Couldn't fetch price for ${symbol}` };

  const totalRevenue = quantity * price;
  //liveUpdateStock(symbol, stock.quantity - quantity, stock.avgPrice);
  //liveUpdateCash(liveGetCash() + totalRevenue);
  liveAddTransaction('SELL', symbol, quantity, price);
  placeNewOrder({ symbol, operation: 'SELL', quantity, price, priority });

  return { success: true, msg: `✅ Sold ${quantity} x ${symbol} @ ${price.toFixed(2)} TRY` };
}

async function liveSellAllStock(symbol, priority = 0) {
  const stock = liveGetStock(symbol);
  if (!stock || stock.quantity <= 0) {
    return { success: false, msg: `❌ No ${symbol} to sell.` };
  }

  const price = await fetchLatestPrice(symbol);
  if (!price) return { success: false, msg: `❌ Couldn't fetch price for ${symbol}` };

  const totalRevenue = stock.quantity * price * 0.9975;
  //liveUpdateStock(symbol, 0, 0);
  //liveUpdateCash(liveGetCash() + totalRevenue);
  liveAddTransaction('SELL', symbol, stock.quantity, price);
  await placeNewOrder({ symbol, operation: 'SELL', quantity: stock.quantity, price, priority });
  addBypass(symbol, 1); // add a 4 bar cooldown upon selling.

  return { success: true, msg: `✅ Sold all ${stock.quantity} x ${symbol} @ ${price.toFixed(2)} TRY (Revenue: ${totalRevenue.toFixed(2)} TRY)` };
}

async function liveGetPortfolio() {
  const cashBalance = liveGetCash();
  const symbolsFromDB = db.prepare("SELECT symbol FROM portfolio").all().map(r => r.symbol);
  const orders = loadOrders();
  const symbolsFromOrders = Array.from(new Set(orders.map(o => o.symbol)));
  const allSymbols = Array.from(new Set([...symbolsFromDB, ...symbolsFromOrders]));

  let totalCost = 0;
  let totalValue = 0;
  const positionDetails = [];

  for (const symbol of allSymbols) {
    const position = liveGetStock(symbol);
    if (position.quantity <= 0) continue;

    const currentPrice = await fetchLatestPrice(symbol);
    if (!currentPrice) continue;

    let lastBuyDate = liveGetLastBuyDate(symbol);
    if (!lastBuyDate) {
      lastBuyDate = 0;
    }

    const costBasis = position.avgPrice * position.quantity;
    const currentValue = currentPrice * position.quantity;
    const profitLoss = currentValue - costBasis;
    const profitLossPercent = (profitLoss / costBasis) * 100;

    totalCost += costBasis;
    totalValue += currentValue;

    positionDetails.push({
      symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      currentPrice,
      costBasis,
      currentValue,
      profitLoss,
      profitLossPercent,
      lastBuyDate
    });
  }

  const totalProfitLoss = totalValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  const netWorth = cashBalance + totalValue;

  const formatCurrency = (value) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const positionStrings = positionDetails.map(pos => {
    return [
      `<blockquote expandable>📈 ${pos.symbol} x ${pos.quantity} (${formatPercent(pos.profitLossPercent)})\n
      ${formatDateForPortfolio(pos.lastBuyDate)}
      ⏳ Avg Price: ${formatCurrency(pos.avgPrice)} TRY
      💰 Current: ${formatCurrency(pos.currentPrice)} TRY
      📊 Value: ${formatCurrency(pos.currentValue)} TRY
      🎯 P/L: ${formatCurrency(pos.profitLoss)} TRY (${formatPercent(pos.profitLossPercent)})</blockquote>`,
      ''
    ].join('\n');
  });

  const summary = [
    `💵 Cash Balance: ${formatCurrency(cashBalance)} TRY`,
    `🏦 Portfolio Value: ${formatCurrency(totalValue)} TRY`,
    `📈 Total Invested: ${formatCurrency(totalCost)} TRY`,
    `🚀 Total P/L: ${formatCurrency(totalProfitLoss)} TRY (${formatPercent(totalProfitLossPercent)})`,
    `🪙 Net Worth: ${formatCurrency(netWorth)} TRY`,
    ''
  ].join('\n');

  return {
    summary,
    positions: positionStrings,
    rawData: {
      cashBalance,
      totalCost,
      totalValue,
      totalProfitLoss,
      totalProfitLossPercent,
      netWorth,
      positions: positionDetails
    }
  };
}


async function liveSyncDatabaseWithPositions(algolabPositions) {
  const changes = [];
  const seen = new Set();

  for (const item of algolabPositions) {
    const symbol = item.code?.trim();
    const quantity = parseFloat(item.totalstock);
    const avgPrice = parseFloat(item.maliyet);

    if (!symbol || symbol === '-' || isNaN(quantity) || quantity === 0) continue;

    seen.add(symbol);
    const dbStock = liveGetStockRaw(symbol);
    const dbQty = dbStock?.quantity || 0;
    const dbPrice = dbStock?.avgPrice || 0;

    const qtyMatch = Math.abs(dbQty - quantity) < 0.0001;
    const priceMatch = Math.abs(dbPrice - avgPrice) < 0.0001;

    if (!qtyMatch || !priceMatch) {
      liveUpdateStock(symbol, quantity, avgPrice);
      changes.push(`🔁 Updated ${symbol}: QTY ${dbQty} → ${quantity}, Price ${dbPrice} → ${avgPrice}`);
    } else {
      changes.push(`✅ ${symbol} already synced`);
    }
  }

  const currentSymbols = db.prepare("SELECT symbol FROM portfolio WHERE quantity > 0").all().map(r => r.symbol);
  for (const sym of currentSymbols) {
    if (!seen.has(sym)) {
      liveUpdateStock(sym, 0, 0);
      changes.push(`❌ Removed ${sym}: not in bank account`);
    }
  }

  console.log(changes);
  return { success: true, changes };

}

function liveSyncCash(tradeLimit) {
  const amount = parseFloat(tradeLimit);
  if (isNaN(amount)) {
    return { success: false, msg: `❌ Invalid tradeLimit: ${tradeLimit}` };
  }

  liveUpdateCash(amount);
  cashSynced = new Date();
  return { success: true, msg: `✅ Cash updated to ${amount.toFixed(2)} TRY` };
}

export {
  liveBuyStock,
  liveSellStock,
  liveSellAllStock,
  liveBuyStockUpToLimit,
  liveGetCeilingFloor,
  liveCalculateBuyQuantity,
  liveGetCash,
  liveGetStock,
  liveGetCashRaw,
  liveGetStockRaw,
  liveGetPortfolio,
  liveAddTransaction,
  liveGetLastBuyDate,
  liveUpdateCash,
  liveUpdateStock,
  liveSyncDatabaseWithPositions,
  liveSyncCash
};