import path from 'path';
import sqlite3 from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.resolve(__dirname, '../../simulation.db');
const db = new sqlite3(dbPath);

import { fetchLatestPrice } from '../../algolab/livePrice.js';

function simulationGetCash() {
  return db.prepare("SELECT balance FROM cash WHERE id = 1").get().balance;
}

function simulationUpdateCash(amount) {
  db.prepare("UPDATE cash SET balance = ? WHERE id = 1").run(amount);
}

function simulationGetStock(symbol) {
  return db.prepare("SELECT * FROM portfolio WHERE symbol = ?").get(symbol);
}

function simulationUpdateStock(symbol, quantity, avgPrice) {
  db.prepare(`
    INSERT INTO portfolio (symbol, quantity, avgPrice)
    VALUES (?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      quantity = excluded.quantity,
      avgPrice = excluded.avgPrice
  `).run(symbol, quantity, avgPrice);
}

function simulationAddTransaction(type, symbol, quantity, price) {
  db.prepare(`
    INSERT INTO transactions (type, symbol, quantity, price, date)
    VALUES (?, ?, ?, ?, ?)
  `).run(type, symbol, quantity, price, new Date().toISOString());
}


async function simulationBuyStock(symbol, quantity) {
    const price = await fetchLatestPrice(symbol);
    if (!price) return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Couldn't fetch price for ${symbol}` };
  
    const totalCost = quantity * price;
    const currentCash = simulationGetCash();
  
    if (currentCash < totalCost) {
      return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Not enough cash. Needed: ${totalCost.toFixed(2)} TRY, Available: ${currentCash.toFixed(2)} TRY` };
    }
  
    const stock = simulationGetStock(symbol) || { quantity: 0, avgPrice: 0 };
    const newQuantity = stock.quantity + quantity;
    const newAvgPrice = ((stock.avgPrice * stock.quantity) + totalCost) / newQuantity;
  
    simulationUpdateStock(symbol, newQuantity, newAvgPrice);
    simulationUpdateCash(currentCash - totalCost);
    simulationAddTransaction('BUY', symbol, quantity, price);
  
    return { success: true, msg: `<i>- SIMULATION -</i>\n✅ Bought ${quantity} x ${symbol} @ ${price.toFixed(2)} TRY`};

}

async function simulationCalculateBuyQuantity(symbol, priceLimit) {

  const price = await fetchLatestPrice(symbol);
  if (typeof price !== 'number' || price <= 0) {
      return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Couldn't fetch valid price for ${symbol}. Price: ${price}` };
  }

  const currentCash = simulationGetCash();

  let quantityToBuy = 0;
  let currentTotalCost = 0;

  // Calculate the maximum quantity we can buy based on the limit and the dynamic rule
  // We'll iterate, adding one share at a time, as long as we can afford it
  // AND the dynamic rule allows it relative to the price limit.
  while (true) {
    const potentialNextQuantity = quantityToBuy + 1;
    const potentialNextCost = potentialNextQuantity * price;

    // 1. Check Affordability: Can we afford this next share?
    if (potentialNextCost > currentCash) {
        // Cannot afford the next share, stop here.
        break;
    }

    // 2. Check Limit Rule: Does buying this next share respect the price limit rule?
    const exceedsLimit = potentialNextCost > priceLimit;
    const excessAmount = exceedsLimit ? potentialNextCost - priceLimit : 0; // How much we exceed the limit by buying this share

    // The dynamic rule: If it exceeds the limit, the excess amount must be <= half the price of one share.
    // If it doesn't exceed the limit, the rule is considered met for this check.
    const dynamicRuleMet = exceedsLimit ? excessAmount <= (price / 2) : true;

    if (!dynamicRuleMet) {
          // Buying the next share exceeds the limit AND violates the dynamic rule, stop here.
        break;
    }

    // If we reached here, we can afford the next share AND it respects the limit rule.
    // So, we buy this share and continue the loop to check the *next* one.
    quantityToBuy = potentialNextQuantity;
    currentTotalCost = potentialNextCost;

    // The loop will naturally terminate when either affordability fails or the dynamic rule fails for the *next* share.
  }

  return {success: true, quantityToBuy: quantityToBuy};

}

// THE ULTIMATE GENIUS DEMİR PRICE LIMIT BUY FUNCTION by Gemini (and Arda with love)
async function simulationBuyStockUpToLimit(symbol, priceLimit) {

    if (typeof priceLimit !== 'number' || priceLimit <= 0) {
        return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Invalid price limit. Must be a positive number.` };
    }

    const price = await fetchLatestPrice(symbol);
    if (typeof price !== 'number' || price <= 0) {
        return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Couldn't fetch valid price for ${symbol}. Price: ${price}` };
    }

    const currentCash = simulationGetCash();

    const { quantityToBuy } = await simulationCalculateBuyQuantity(symbol, priceLimit);

    // After the loop, quantityToBuy is the maximum possible quantity meeting the criteria.
    const finalCost = (quantityToBuy * price) * 1.0025; // Recalculate final cost based on determined quantity + COMMISSION AND EXPENSES 0.025%

    // Check if we were able to determine any quantity to buy
    if (quantityToBuy === 0) {
         // Check if it was because we couldn't even afford the first share
         if (price > currentCash) {
             return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Not enough cash to buy even one share of ${symbol}. Price: ${price.toFixed(2)} TRY, Available: ${currentCash.toFixed(2)} TRY` };
         } else {
             // It means the first share exceeded the limit and violated the dynamic rule
              return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Could not buy any shares of ${symbol} within the specified limit and dynamic rule. Price: ${price.toFixed(2)} TRY, Limit: ${priceLimit.toFixed(2)} TRY` };
         }
    }

    // If we reached here, quantityToBuy > 0 and finalCost <= currentCash (checked by the loop condition)

    // Proceed with updating simulation state
    const stock = simulationGetStock(symbol) || { quantity: 0, avgPrice: 0 };
    const newQuantity = stock.quantity + quantityToBuy;

    // Calculate the new average price, handling the case where newQuantity is 0 defensively
    const costOfExistingStock = stock.avgPrice * stock.quantity;
    const newAvgPrice = newQuantity === 0 ? 0 : (costOfExistingStock + finalCost) / newQuantity;

    simulationUpdateStock(symbol, newQuantity, newAvgPrice);
    simulationUpdateCash(currentCash - finalCost);
    simulationAddTransaction('BUY', symbol, quantityToBuy, price); // Log the transaction with the bought quantity and price

    return { success: true, msg: `<i>- SIMULATION -</i>\n✅ Bought ${quantityToBuy} x ${symbol} @ ${price.toFixed(2)} TRY (Total: ${finalCost.toFixed(2)} TRY, Limit: ${priceLimit.toFixed(2)} TRY)`};
}


async function simulationSellAllStock(symbol) {
  const stock = simulationGetStock(symbol);

  // Check if the user holds this stock at all, or if the quantity is zero
  if (!stock || stock.quantity <= 0) {
      return { success: false, msg: `<i>- SIMULATION -</i>\n❌ You do not hold any shares of ${symbol} to sell.` };
  }

  // Determine the quantity to sell (all of it)
  const quantityToSell = stock.quantity;

  const price = await fetchLatestPrice(symbol);
   if (typeof price !== 'number' || price <= 0) {
       // Handle cases where price fetching failed or returned invalid price
      return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Couldn't fetch valid price for ${symbol} to sell. Price: ${price}` };
  }

  // Calculate the total revenue from the sale before fees
  const totalRevenue = (quantityToSell * price) * 0.9975;


  // Update simulation state
  // When selling all, quantity becomes 0 and avgPrice becomes irrelevant (set to 0)
  simulationUpdateStock(symbol, 0, 0);

  // Update cash balance - add the net revenue
  const currentCash = simulationGetCash();
  simulationUpdateCash(currentCash + totalRevenue);

  // Log the transaction - log the stock details and potentially the fee separately
  // Assuming simulationAddTransaction logs stock type, symbol, quantity, and base price per share
  simulationAddTransaction('SELL', symbol, quantityToSell, price);
  // Depending on your logging system, you might add a separate log for the fee:
  // simulationAddExpense('SELL_FEE', symbol, commission);


  // Success message should show the breakdown
  return { success: true, msg: `<i>- SIMULATION -</i>\n✅ Sold ${quantityToSell} x ${symbol} @ ${price.toFixed(2)} TRY (Revenue: ${totalRevenue.toFixed(2)} TRY)` };
}

async function simulationSellStock(symbol, quantity) {
    const stock = simulationGetStock(symbol);
    if (!stock || stock.quantity < quantity) {
      return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Not enough shares to sell. You have ${stock?.quantity || 0}` };
    }
  
    const price = await fetchLatestPrice(symbol);
    if (!price) return { success: false, msg: `<i>- SIMULATION -</i>\n❌ Couldn't fetch price for ${symbol}` };
  
    const totalRevenue = quantity * price;
    simulationUpdateStock(symbol, stock.quantity - quantity, stock.avgPrice);
    simulationUpdateCash(simulationGetCash() + totalRevenue);
    simulationAddTransaction('SELL', symbol, quantity, price);
  
    return { success: true, msg: `<i>- SIMULATION -</i>\n✅ Sold ${quantity} x ${symbol} @ ${price.toFixed(2)} TRY` };
}

async function simulationGetPortfolio() {
  // Get current cash balance
  const cashBalance = simulationGetCash();
  
  // Get all positions from portfolio
  const positions = db.prepare("SELECT symbol, quantity, avgPrice FROM portfolio WHERE quantity > 0").all();
  
  // Calculate portfolio metrics
  let totalCost = 0;
  let totalValue = 0;
  const positionDetails = [];
  
  // Process each position
  for (const position of positions) {
    const currentPrice = await fetchLatestPrice(position.symbol);
    if (!currentPrice) continue; // Skip if we can't get price
    
    const costBasis = position.avgPrice * position.quantity;
    const currentValue = currentPrice * position.quantity;
    const profitLoss = currentValue - costBasis;
    const profitLossPercent = (profitLoss / costBasis) * 100;
    
    totalCost += costBasis;
    totalValue += currentValue;
    
    positionDetails.push({
      symbol: position.symbol,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      currentPrice: currentPrice,
      costBasis: costBasis,
      currentValue: currentValue,
      profitLoss: profitLoss,
      profitLossPercent: profitLossPercent
    });
  }
  
  // Calculate overall portfolio metrics
  const totalProfitLoss = totalValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  const netWorth = cashBalance + totalValue;
  
  // Format the output
  const formatCurrency = (value) => value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  
  // Build position strings
  const positionStrings = positionDetails.map(pos => {
    return [
      `<blockquote expandable>📈 ${pos.symbol} x ${pos.quantity}\n
      ⏳ Avg Price: ${formatCurrency(pos.avgPrice)} TRY
      💰 Current: ${formatCurrency(pos.currentPrice)} TRY
      📊 Value: ${formatCurrency(pos.currentValue)} TRY
      🎯 P/L: ${formatCurrency(pos.profitLoss)} TRY (${formatPercent(pos.profitLossPercent)})</blockquote>`,
      ''
    ].join('\n');
  });
  
  // Create summary
  const summary = [
    `💵 Cash Balance: ${formatCurrency(cashBalance)} TRY`,
    `🏦 Portfolio Value: ${formatCurrency(totalValue)} TRY`,
    `📈 Total Invested: ${formatCurrency(totalCost)} TRY`,
    `🚀 Total P/L: ${formatCurrency(totalProfitLoss)} TRY (${formatPercent(totalProfitLossPercent)})`,
    `🪙 Net Worth: ${formatCurrency(netWorth)} TRY`,
    ''
  ].join('\n');
  
  return {
    summary: summary,
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

export {
  simulationBuyStock,
  simulationSellStock,
  simulationGetPortfolio,
  simulationBuyStockUpToLimit,
  simulationSellAllStock,
  simulationCalculateBuyQuantity,
  simulationGetCash,
  simulationGetStock
};