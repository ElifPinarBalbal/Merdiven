/*

Merdiven Project Main Functions of Telegram Bot.
by Arda


*/



import { sendOrderConfirmationMessage, sendMessage, editMessage, sendOrderNotificationMessage, sendBypassConfirmationMessage, sendCriticalHaltConfirmationMessage } from "./Telegram.js";
import { fetchLatestPrice } from "../../algolab/livePrice.js";
import { liveBuyStockUpToLimit, liveCalculateBuyQuantity, liveGetCash, liveGetStock, liveSellAllStock, liveGetPortfolio } from "../../algolab/portfolio/lib/portfolioService.js";
import { sanitizeForTelegramHTML } from "../../misc/sanitize_telegram_html.js";
import { addOverallBypass, stopOverallBypass } from "../../news_main/bypass/bypass.js";
import { waitUntilOrdersJsonIsEmpty } from '../../misc/waitOrdersJson.js'
import fs from 'fs';

global.orders = [];

const BUY_LIMIT = parseInt(process.env.BUY_LIMIT, 10);
const authorizedId = process.env.TELEGRAM_AUTHORIZED_IDS.split(',').map(Number);

export async function LiveBot_Buy({symbol, time = 1, priceLimit = BUY_LIMIT, priority = 0}, {reason = 'Unspecified', reasonText = 'Unspecified'}) {

    try {

        let now = new Date();
        const price = await fetchLatestPrice(symbol);
        const currentCash = await liveGetCash();
        const { quantityToBuy } = await liveCalculateBuyQuantity(symbol, priceLimit, 0, true);

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);
        
        if (quantityToBuy === 0) {
            // Check if it was because we couldn't even afford the first share
            if (price > currentCash) {
                console.log(`Tried to send a buy message for ${symbol}, but not enough cash for even one share.`);
                return { success: false, msg: `❌ Not enough cash to buy even one share of ${symbol}. Price: ${price.toFixed(2)} TRY, Available: ${currentCash.toFixed(2)} TRY` };
            } else {
                // It means the first share exceeded the limit and violated the dynamic rule
                console.log(`Tried to send a buy message for ${symbol}, but not enough cash for even one share, because price changed during dynamic buy.`);
                return { success: false, msg: `❌ Could not buy any shares of ${symbol} within the specified limit and dynamic rule. Price: ${price.toFixed(2)} TRY, Limit: ${priceLimit} TRY` };
            }
        }

        const buyMessage = `<u>🟢 BUY NOTICE - in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * price) * 1.0025).toFixed(2)} TRY) | Balance: ${currentCash.toFixed(2)} TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nSelect an action below.`;
        const messageIds = await Promise.all(
            authorizedId.map(async (id) => {
              const { messageId } = await sendOrderConfirmationMessage(id, buyMessage);
              return {
                chat_id: id,
                message_id: messageId
              };
            })
        );

        const timeout = setTimeout(async () => {
            const { msg } = await liveBuyStockUpToLimit(symbol, priceLimit, priority);
            await Promise.all(
                messageIds.map(({ chat_id, message_id }) => (
                    editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🟢 BUY NOTICE - in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * price) * 1.0025).toFixed(2)} TRY) | Balance: ${currentCash.toFixed(2)} TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nTransaction Commenced.`,keyboard: {}}),
                    sendMessage(chat_id, msg)
                ))
            );
            // Remove from global.orders
            global.orders = global.orders.filter(order => order.timeout !== timeout);
            return;
        }, time * 60 * 1000); // 60 seconds = 1 minute
        global.orders.push({ messageIds, timeout, symbol, op: "buy", msg: buyMessage, priceLimit, priority });

    } catch (err) {
        console.log('Error occured during livebot_buy:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}

export async function LiveBot_Sell({symbol, time = 1, quantity = 0, priority = 0}, {reason, reasonText}) {

    try {

        let now = new Date();
        const price = await fetchLatestPrice(symbol);
        const currentCash = await liveGetCash();
        const ownedstock = liveGetStock(symbol);
        let quantityToSell;
        if (quantity === 0) {
            quantityToSell = ownedstock.quantity;
        } else {
            quantityToSell = quantity;
        }
        const cost = ownedstock.avgPrice;
        const difference = price - cost;
        const profitloss = (quantityToSell * price) * 0.9975;

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);
        
        let sign;
        if (profitloss >= (cost * quantityToSell)) {
            sign = "+";
        } else {
            sign = "";
        }
        
        if (quantityToSell === 0 || !ownedstock) {
            // It means the first share exceeded the limit and violated the dynamic rule
            console.log(`Tried to send a sell message for ${symbol}, but you do not hold any shares.`);
            return { success: false, msg: `❌ You do not hold any shares of ${symbol} to sell.` };
        }

        const sellMessage = `<u>🔴 SELL NOTICE - in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * price).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((price - cost) / (cost))*100).toFixed(2)}%)\nBalance: ${currentCash.toFixed(2)} TRY</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nSelect an action below.`;
        const messageIds = await Promise.all(
            authorizedId.map(async (id) => {
              const { messageId } = await sendOrderConfirmationMessage(id, sellMessage);
              return {
                chat_id: id,
                message_id: messageId
              };
            })
        );

        const timeout = setTimeout(async () => {
            const { msg } = await liveSellAllStock(symbol, priority);
            await Promise.all(
                messageIds.map(({ chat_id, message_id }) => (
                    editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🔴 SELL NOTICE - in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * price).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((price - cost) / (cost))*100).toFixed(2)}%)\nBalance: ${currentCash.toFixed(2)} TRY</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nTransaction Commenced.`, keyboard: {}}),
                    sendMessage(chat_id, msg)
                ))
            );
            // Remove from global.orders
            global.orders = global.orders.filter(order => order.timeout !== timeout);
            return;
        }, time * 60 * 1000); // 60 seconds = 1 minute
        global.orders.push({ messageIds, timeout, symbol, op: "sell", msg: sellMessage, priority });

    } catch (err) {
        console.log('Error occured during livebot_sell:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}


export async function LiveBot_BuyNotify({symbol, time = 15, priceLimit = BUY_LIMIT}, {reason = 'Unspecified', reasonText = 'Unspecified'}) {

    try {

        let now = new Date();
        const price = await fetchLatestPrice(symbol);
        const currentCash = await liveGetCash();
        const { quantityToBuy } = await liveCalculateBuyQuantity(symbol, priceLimit);

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);
        
        if (quantityToBuy === 0) {
            // Check if it was because we couldn't even afford the first share
            if (price > currentCash) {
                console.log(`Tried to send a buy message for ${symbol}, but not enough cash for even one share.`);
                return { success: false, msg: `❌ Not enough cash to buy even one share of ${symbol}. Price: ${price.toFixed(2)} TRY, Available: ${currentCash.toFixed(2)} TRY` };
            } else {
                // It means the first share exceeded the limit and violated the dynamic rule
                console.log(`Tried to send a buy message for ${symbol}, but not enough cash for even one share, because price changed during dynamic buy.`);
                return { success: false, msg: `❌ Could not buy any shares of ${symbol} within the specified limit and dynamic rule. Price: ${price.toFixed(2)} TRY, Limit: ${priceLimit} TRY` };
            }
        }

        const buyMessage = `<u>🔔🟢 BUY NOTIFICATION - expires in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * price) * 1.0025).toFixed(2)} TRY) | Balance: ${currentCash.toFixed(2)} TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nSelect an action below.`;
        const messageIds = await Promise.all(
            authorizedId.map(async (id) => {
              const { messageId } = await sendOrderNotificationMessage(id, buyMessage);
              return {
                chat_id: id,
                message_id: messageId
              };
            })
        );

        const timeout = setTimeout(async () => {
            await Promise.all(
                messageIds.map(({ chat_id, message_id }) => (
                    editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🔔🟢 BUY NOTIFICATION - expires in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * price) * 1.0025).toFixed(2)} TRY) | Balance: ${currentCash.toFixed(2)} TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nExpired.`,keyboard: {"inline_keyboard": [[{text: "Refresh Notification 🔄", callback_data: "Refresh"},]]}})
                ))
            );
            // Remove from global.orders
            global.orders = global.orders.filter(order => order.timeout !== timeout);
            return;
        }, time * 60 * 1000); // 60 seconds = 1 minute
        global.orders.push({ messageIds, timeout, symbol, op: "buy", priceLimit, msg: buyMessage });

    } catch (err) {
        console.log('Error occured during livebot_buynotify:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}

export async function LiveBot_SellNotify({symbol, time = 15, quantity = 0}, {reason = 'Unspecified', reasonText = 'Unspecified'}) {

    try {

        let now = new Date();
        const price = await fetchLatestPrice(symbol);
        const currentCash = await liveGetCash();
        const ownedstock = liveGetStock(symbol);
        let quantityToSell;
        if (quantity === 0) {
            quantityToSell = ownedstock.quantity;
        } else {
            quantityToSell = quantity;
        }
        const cost = ownedstock.avgPrice;
        const difference = price - cost;
        const profitloss = (quantityToSell * price) * 0.9975;

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);
        
        let sign;
        if (profitloss >= (cost * quantityToSell)) {
            sign = "+";
        } else {
            sign = "";
        }
        
        if (quantityToSell === 0 || !ownedstock) {
            // It means the first share exceeded the limit and violated the dynamic rule
            console.log(`Tried to send a sell message for ${symbol}, but you do not hold any shares.`);
            return { success: false, msg: `❌ You do not hold any shares of ${symbol} to sell.` };
        }

        const sellMessage = `<u>🔔🔴 SELL NOTIFICATION - expires in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * price).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((price - cost) / (cost))*100).toFixed(2)}%)\nBalance: ${currentCash.toFixed(2)} TRY</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nSelect an action below.`;
        const messageIds = await Promise.all(
            authorizedId.map(async (id) => {
              const { messageId } = await sendOrderNotificationMessage(id, sellMessage);
              return {
                chat_id: id,
                message_id: messageId
              };
            })
        );


        const timeout = setTimeout(async () => {
            await Promise.all(
                messageIds.map(({ chat_id, message_id }) => (
                    editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🔔🔴 SELL NOTIFICATION - expires in ${time} minutes</u>\n\n<b>${symbol} - ${price.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * price).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((price - cost) / (cost))*100).toFixed(2)}%)\nBalance: ${currentCash.toFixed(2)} TRY</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nExpired.`, keyboard: {"inline_keyboard": [[{text: "Refresh Notification 🔄", callback_data: "Refresh"},]]}})
                ))
            );
            // Remove from global.orders
            global.orders = global.orders.filter(order => order.timeout !== timeout);
            return;
        }, time * 60 * 1000); // 60 seconds = 1 minute
        global.orders.push({ messageIds, timeout, symbol, op: "sell", msg: sellMessage });

    } catch (err) {
        console.log('Error occured during livebot_sellnotify:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}


export async function LiveBot_Jump({symbolToSell, symbolToBuy, time = 1, priceLimit = BUY_LIMIT, priority = 0}, {reason = 'Unspecified', reasonText = 'Unspecified'}) {

    try {

        let now = new Date();
        const priceSell = await fetchLatestPrice(symbolToSell);
        const priceBuy = await fetchLatestPrice(symbolToBuy);

        const currentCash = await liveGetCash();

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);

        const ownedstock = liveGetStock(symbolToSell);
        let quantityToSell = ownedstock.quantity;

        const cost = ownedstock.avgPrice;
        const difference = priceSell - cost;
        const profitloss = (quantityToSell * priceSell) * 0.9975;
        
        let sign;
        if (profitloss >= (cost * quantityToSell)) {
            sign = "+";
        } else {
            sign = "";
        }
        
        if (quantityToSell === 0 || !ownedstock) {
            console.log(`[JUMP SIGNAL] Tried to send a jump message for ${symbolToSell} → ${symbolToBuy}, but you do not hold any shares of ${symbolToSell}.`);
            return { success: false, msg: `❌ You do not hold any shares of ${symbolToSell} to sell.` };
        }

        const { quantityToBuy } = await liveCalculateBuyQuantity(symbolToBuy, priceLimit, (quantityToSell * priceSell * 0.995));
        
        if (quantityToBuy === 0) {
            // Check if it was because we couldn't even afford the first share
            if (priceBuy > currentCash) {
                console.log(`[JUMP SIGNAL] Tried to send a jump message for ${symbolToSell} → ${symbolToBuy}, but not enough cash for even one share of ${symbolToBuy}.`);
                return { success: false, msg: `❌ Not enough cash to buy even one share of ${symbolToBuy}. Price: ${priceBuy.toFixed(2)} TRY, Available: ${(currentCash + (priceSell * 0.995)).toFixed(2)} TRY` };
            } else {
                // It means the first share exceeded the limit and violated the dynamic rule
                console.log(`[JUMP SIGNAL] Tried to send a jump message for ${symbolToSell} → ${symbolToBuy}, but not enough cash for even one share of ${symbolToBuy}. Price of 1 share must have changed.`);
                return { success: false, msg: `❌ Could not buy any shares of ${symbolToBuy} within the specified limit and dynamic rule. Price: ${(currentCash + (priceSell * 0.995)).toFixed(2)} TRY, Limit: ${priceLimit} TRY` };
            }
        }

        const jumpMessage = `<u>🟡 JUMP NOTICE - in ${time} minutes</u>\n\n<b>🔸 ${symbolToSell} - ${priceSell.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * priceSell).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((priceSell - cost) / (cost))*100).toFixed(2)}%)</b>\n\n🔄\n\n<b>🔹 ${symbolToBuy} - ${priceBuy.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * priceBuy) * 1.0025).toFixed(2)} TRY)\n\nBalance: ${currentCash.toFixed(2)} + <i>${(priceSell * quantityToSell).toFixed(2)}</i> TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nSelect an action below.`;
        const messageIds = await Promise.all(
            authorizedId.map(async (id) => {
              const { messageId } = await sendOrderConfirmationMessage(id, jumpMessage);
              return {
                chat_id: id,
                message_id: messageId
              };
            })
        );

        const timeout = setTimeout(async () => {
            const { msg: msgSell } = await liveSellAllStock(symbolToSell, priority);
            const { msg: msgBuy } = await liveBuyStockUpToLimit(symbolToBuy, priceLimit, priority);
            await Promise.all(
                messageIds.map(({ chat_id, message_id }) => (
                    editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🟡 JUMP NOTICE - in ${time} minutes</u>\n\n<b>🔸 ${symbolToSell} - ${priceSell.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * priceSell).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((priceSell - cost) / (cost))*100).toFixed(2)}%)</b>\n\n🔄\n\n<b>🔹 ${symbolToBuy} - ${priceBuy.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * priceBuy) * 1.0025).toFixed(2)} TRY)\n\nBalance: ${currentCash.toFixed(2)} + <i>${(priceSell * quantityToSell).toFixed(2)}</i> TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nTransaction Commenced.`,keyboard: {}}),
                    sendMessage(chat_id, msgSell),
                    sendMessage(chat_id, msgBuy)
                ))
            );
            // Remove from global.orders
            global.orders = global.orders.filter(order => order.timeout !== timeout);
            return;
        }, time * 60 * 1000); // 60 seconds = 1 minute
        global.orders.push({ messageIds, timeout, symbol: {symbolToBuy, symbolToSell}, op: "jump", msg: jumpMessage, priceLimit, priority });

    } catch (err) {
        console.log('Error occured during livebot_jump:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}

export async function LiveBot_JumpNotify({symbolToSell, symbolToBuy, time = 15, priceLimit = BUY_LIMIT}, {reason = 'Unspecified', reasonText = 'Unspecified'}) {

    try {

        let now = new Date();
        const priceSell = await fetchLatestPrice(symbolToSell);
        const priceBuy = await fetchLatestPrice(symbolToBuy);

        const currentCash = await liveGetCash();

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);

        const ownedstock = liveGetStock(symbolToSell);
        let quantityToSell = ownedstock.quantity;

        const cost = ownedstock.avgPrice;
        const difference = priceSell - cost;
        const profitloss = (quantityToSell * priceSell) * 0.9975;
        
        let sign;
        if (profitloss >= (cost * quantityToSell)) {
            sign = "+";
        } else {
            sign = "";
        }
        
        if (quantityToSell === 0 || !ownedstock) {
            console.log(`[JUMP SIGNAL] Tried to send a jump message for ${symbolToSell} → ${symbolToBuy}, but you do not hold any shares of ${symbolToSell}.`);
            return { success: false, msg: `❌ You do not hold any shares of ${symbolToSell} to sell.` };
        }

        const { quantityToBuy } = await liveCalculateBuyQuantity(symbolToBuy, priceLimit, (quantityToSell * priceSell * 0.995));
        
        if (quantityToBuy === 0) {
            // Check if it was because we couldn't even afford the first share
            if (priceBuy > currentCash) {
                console.log(`[JUMP SIGNAL] Tried to send a jump message for ${symbolToSell} → ${symbolToBuy}, but not enough cash for even one share of ${symbolToBuy}.`);
                return { success: false, msg: `❌ Not enough cash to buy even one share of ${symbolToBuy}. Price: ${priceBuy.toFixed(2)} TRY, Available: ${(currentCash + (priceSell * 0.995)).toFixed(2)} TRY` };
            } else {
                // It means the first share exceeded the limit and violated the dynamic rule
                console.log(`[JUMP SIGNAL] Tried to send a jump message for ${symbolToSell} → ${symbolToBuy}, but not enough cash for even one share of ${symbolToBuy}. Price of 1 share must have changed.`);
                return { success: false, msg: `❌ Could not buy any shares of ${symbolToBuy} within the specified limit and dynamic rule. Price: ${(currentCash + (priceSell * 0.995)).toFixed(2)} TRY, Limit: ${priceLimit} TRY` };
            }
        }

        const jumpMessage = `<u>🔔🟡 JUMP NOTIFICATION - expires in ${time} minutes</u>\n\n<b>🔸 ${symbolToSell} - ${priceSell.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * priceSell).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((priceSell - cost) / (cost))*100).toFixed(2)}%)</b>\n\n🔄\n\n<b>🔹 ${symbolToBuy} - ${priceBuy.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * priceBuy) * 1.0025).toFixed(2)} TRY)\n\nBalance: ${currentCash.toFixed(2)} + <i>${(priceSell * quantityToSell).toFixed(2)}</i> TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nSelect an action below.`;
        const messageIds = await Promise.all(
            authorizedId.map(async (id) => {
              const { messageId } = await sendOrderNotificationMessage(id, jumpMessage);
              return {
                chat_id: id,
                message_id: messageId
              };
            })
        );

        const timeout = setTimeout(async () => {
            await Promise.all(
                messageIds.map(({ chat_id, message_id }) => (
                    editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🔔🟡 JUMP NOTIFICATION - expires in ${time} minutes</u>\n\n<b>🔸 ${symbolToSell} - ${priceSell.toFixed(2)} TRY</b>\nx${quantityToSell} (${(quantityToSell * priceSell).toFixed(2)} TRY)\nCost: ${cost.toFixed(2)} x${quantityToSell} <b>(${(cost * quantityToSell).toFixed(2)} TRY) (${sign}${(profitloss - (cost * quantityToSell)).toFixed(2)} TRY) (${sign}${(((priceSell - cost) / (cost))*100).toFixed(2)}%)</b>\n\n🔄\n\n<b>🔹 ${symbolToBuy} - ${priceBuy.toFixed(2)} TRY</b>\nx${quantityToBuy} (${((quantityToBuy * priceBuy) * 1.0025).toFixed(2)} TRY)\n\nBalance: ${currentCash.toFixed(2)} + <i>${(priceSell * quantityToSell).toFixed(2)}</i> TRY\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\nExpired.`, keyboard: {"inline_keyboard": [[{text: "Refresh Notification 🔄", callback_data: "Refresh"},]]}})
                ))
            );
            // Remove from global.orders
            global.orders = global.orders.filter(order => order.timeout !== timeout);
            return;
        }, time * 60 * 1000); // 60 seconds = 1 minute
        global.orders.push({ messageIds, timeout, symbol: {symbolToBuy, symbolToSell}, op: "jump", msg: jumpMessage, priceLimit });

    } catch (err) {
        console.log('Error occured during livebot_jumpnotify:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}


export async function LiveBot_Bypass({symbol = 'ALL', duration = 2, time = 10, tone = 'BEARISH'}, {reason = 'Unspecified', reasonText = 'Unspecified'}) {

    try {

        if (symbol !== 'ALL') {
            // we will handle single symbols here
        }

        const portfolio = await liveGetPortfolio();

        let positionsMsg = ``;

        // Add positions if they exist
        if (portfolio.positions.length > 0) {
            positionsMsg += `<b>📦 Current Positions (${portfolio.positions.length})</b>\n`;
            positionsMsg += portfolio.positions.join('\n');
        } else {
            positionsMsg += '\n⚠️ <b>No active positions</b>';
        }

        positionsMsg = positionsMsg.replace(/\.00/g, ''); // Clean up .00 decimals
        positionsMsg = positionsMsg.replace(/\n{3,}/g, '\n\n'); // Remove extra newlines

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);

        if (tone === 'BEARISH') {

            const indicatorMessage = `<u>🔴⚠️ BEARISH MARKET BYPASS - in ${time} minutes</u>\n\nAI analysis decided a bearish market impact on this news.\nOverall bypass to <b>all unowned positions</b> will be imposed.\n\n🕒 Duration: <b>${duration}</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\n<blockquote expandable>${positionsMsg}</blockquote>\n\n\nChange desired duration below.`;
            const messageIds = await Promise.all(
                authorizedId.map(async (id) => {
                    const { messageId } = await sendBypassConfirmationMessage(id, indicatorMessage);
                    return {
                        chat_id: id,
                        message_id: messageId
                    };
                })
            );
            const timeout = setTimeout(async () => {
                const { msg } = await addOverallBypass(duration, tone = 'BEARISH');
                await Promise.all(
                    messageIds.map(({ chat_id, message_id }) => (
                        editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🔴⚠️ BEARISH MARKET BYPASS - in ${time} minutes</u>\n\nAI analysis decided a bearish market impact on this news.\nOverall bypass to <b>all unowned positions</b> will be imposed.\n\n🕒 Duration: <b>${duration}</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\n<blockquote expandable>${positionsMsg}</blockquote>\n\n\nBypass have been imposed.`, keyboard: {"inline_keyboard": [[{text: "Restart Bypass 🔄", callback_data: "IndicatorBypass-Restart"}],[{text: "Stop Bypass 🛑", callback_data: "IndicatorBypass-Stop"}]]}}),
                        sendMessage(chat_id, msg)
                    ))
                );
                // Remove from global.orders
                global.orders = global.orders.filter(order => order.timeout !== timeout);
                return;
            }, time * 60 * 1000); // 60 seconds = 1 minute
            global.orders.push({ messageIds, timeout, symbol, op: "bypass", tone, duration, msg: indicatorMessage });

        } else if (tone === 'BULLISH') {

            const indicatorMessage = `<u>🟢⚠️ BULLISH MARKET BYPASS - in ${time} minutes</u>\n\nAI analysis decided a bullish market impact on this news.\nOverall bypass to <b>all owned positions</b> will be imposed.\n\n🕒 Duration: <b>${duration}</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\n<blockquote expandable>${positionsMsg}</blockquote>\n\n\nChange desired duration below.`;
            const messageIds = await Promise.all(
                authorizedId.map(async (id) => {
                    const { messageId } = await sendBypassConfirmationMessage(id, indicatorMessage);
                    return {
                        chat_id: id,
                        message_id: messageId
                    };
                })
            );
            const timeout = setTimeout(async () => {
                const { msg } = await addOverallBypass(duration, tone = 'BULLISH');
                await Promise.all(
                    messageIds.map(({ chat_id, message_id }) => (
                        editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u>🟢⚠️ BULLISH MARKET BYPASS - in ${time} minutes</u>\n\nAI analysis decided a bullish market impact on this news.\nOverall bypass to <b>all owned positions</b> will be imposed.\n\n🕒 Duration: <b>${duration}</b>\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\n<blockquote expandable>${positionsMsg}</blockquote>\n\n\nBypass have been imposed.`, keyboard: {"inline_keyboard": [[{text: "Restart Bypass 🔄", callback_data: "IndicatorBypass-Restart"}],[{text: "Stop Bypass 🛑", callback_data: "IndicatorBypass-Stop"}]]}}),
                        sendMessage(chat_id, msg)
                    ))
                );
                // Remove from global.orders
                global.orders = global.orders.filter(order => order.timeout !== timeout);
                return;
            }, time * 60 * 1000); // 60 seconds = 1 minute
            global.orders.push({ messageIds, timeout, symbol, op: "bypass", tone, duration, msg: indicatorMessage });

        }

    } catch (err) {
        console.log('Error occured during livebot_bypassnotify:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}

export async function LiveBot_CriticalHaltSellAll({time = 15}, {reason = 'Unspecified', reasonText = 'Unspecified'}) {

    try {

        const portfolio = await liveGetPortfolio();

        let positionsMsg = ``;

        // Add positions if they exist
        if (portfolio.positions.length > 0) {
            positionsMsg += `<b>📦 Current Positions (${portfolio.positions.length})</b>\n`;
            positionsMsg += portfolio.positions.join('\n');
        } else {
            positionsMsg += '\n⚠️ <b>No active positions</b>';
        }

        positionsMsg = positionsMsg.replace(/\.00/g, ''); // Clean up .00 decimals
        positionsMsg = positionsMsg.replace(/\n{3,}/g, '\n\n'); // Remove extra newlines

        let parsed_reason = sanitizeForTelegramHTML(reason);
        let parsed_reasonText = sanitizeForTelegramHTML(reasonText);

        const indicatorMessage = `<u><b>⚠️🚨 CRITICAL HALT NOTICE - in ${time} minutes</b></u>\n\n<b>SELL ALL</b> positions immediately\nand shutdown the bot.\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\n<blockquote expandable>${positionsMsg}</blockquote>\n\n\nSelect an action below.`;
        const messageIds = await Promise.all(
            authorizedId.map(async (id) => {
                const { messageId } = await sendCriticalHaltConfirmationMessage(id, indicatorMessage);
                return {
                    chat_id: id,
                    message_id: messageId
                };
            })
        );
        const timeout = setTimeout(async () => {
            const currentportfolio = await liveGetPortfolio();
            const ownedSymbols = new Set(currentportfolio.rawData.positions.map(pos => pos.symbol));
            for (const symbol of ownedSymbols) {
                const { msg } = await liveSellAllStock(symbol, 10);
                await Promise.all(
                    messageIds.map(({ chat_id, message_id }) => (
                        sendMessage(chat_id, msg)
                    ))
                );
            }
            await Promise.all(
                messageIds.map(({ chat_id, message_id }) => (
                    editMessage({ messageObj: message_id, chat: chat_id }, {messageText: `<u><b>⚠️🚨 CRITICAL HALT NOTICE - in ${time} minutes</b></u>\n\n<b>SELL ALL</b> positions immediately\nand shutdown the bot.\n\n${parsed_reason}\n<blockquote expandable>${parsed_reasonText}</blockquote>\n\n<blockquote expandable>${positionsMsg}</blockquote>\n\n\nSold all positions and shutdown.`, keyboard: {}})
                ))
            );
            // Remove from global.orders
            global.orders = global.orders.filter(order => order.timeout !== timeout);
            await waitUntilOrdersJsonIsEmpty();
            process.exit(1);
            return;
        }, time * 60 * 1000); // 60 seconds = 1 minute
        global.orders.push({ messageIds, timeout, op: "criticalhalt", msg: indicatorMessage });

        try {
            if (!Array.isArray(global.orders)) return;
            for (const order of global.orders) {
              const { timeout, messageIds = [], msg, op } = order;

              if (op === 'criticalhalt' || op === 'bypass' || op === 'sell') continue;
    
              const cancelText = `${msg}\nTransaction Canceled because of Critical Halt.`;
              // Clear the timeout if it exists
              if (timeout) {
                clearTimeout(timeout);
              }
              // Await both edit and notify messages for all messageIds
              await Promise.all(
                messageIds.flatMap(({ chat_id, message_id }) => [
                  editMessage({ chat: chat_id, messageObj: message_id }, { messageText: cancelText, keyboard: {} })
                ])
              );
            }
            global.orders = global.orders.filter(order =>
                order.op === 'criticalhalt' || order.op === 'bypass' || order.op === 'sell'
            );
        } catch (err) {
            console.log('LiveBot CriticalHalt - Cancel all orders error:', err);
        }

    } catch (err) {
        console.log('Error occured during livebot_criticalhalt:', err);
        return { success: false, msg: `❌ Something went wrong: ${err}` };
    }

}


// Cancel function is used with all types of confirmation / notification.
export async function LiveBot_Cancel(callbackObj) {

    let messageId = callbackObj.message.message_id;
    let messageText = callbackObj.message.text;
    let fromID = callbackObj.from.id;

    const orderIndex = global.orders.findIndex(order =>
        order.messageIds.some(
          msg => msg.chat_id === fromID && msg.message_id === messageId
        )
    );

    if (orderIndex === -1) {
        console.log(`No active order found for messageId: ${messageId} / ${fromID}`);
        return false;
    }

    let symbol = global.orders[orderIndex].symbol;
    let op = global.orders[orderIndex].op;

    let previousMessage = global.orders[orderIndex].msg;

    const cancelText = `${previousMessage}\nTransaction Canceled by <a href="tg://user?id=${fromID}">${callbackObj.from.username}</a>`;

    // Clear the timeout
    try {
        clearTimeout(global.orders[orderIndex].timeout);
        //editMessage({messageObj: messageId}, {messageText: `${messageText}\nTransaction Canceled by <a href="tg://user?id=${fromID}">${callbackObj.from.username}</a>`, keyboard: {}});
        await Promise.all(
            global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) => (
                editMessage({chat: chat_id, messageObj: message_id}, {messageText: cancelText, keyboard: {}}),
                sendMessage(chat_id, `❌ Order ${symbol} / ${op} (${fromID} - ${messageId}) canceled by user request.`)
            ))
        );
    } catch (err) {
        console.log('LiveBot Cancel error:', err);
        return false;
    }

    // Remove it from the global.orders array
    global.orders.splice(orderIndex, 1);

    console.log(`Order with messageId ${messageId} cancelled and removed.`);
    return true;

}

export async function LiveBot_Confirm(callbackObj) {

    let messageId = callbackObj.message.message_id;
    let messageText = callbackObj.message.text;
    let fromID = callbackObj.from.id;

    //const orderIndex = global.orders.findIndex(o => o.messageId === messageId);
    const orderIndex = global.orders.findIndex(order =>
        order.messageIds.some(
          msg => msg.chat_id === fromID && msg.message_id === messageId
        )
    );

    if (orderIndex === -1) {
        console.log(`No active order found for messageId: ${messageId}`);
        return false;
    }

    let symbol = global.orders[orderIndex].symbol;
    let op = global.orders[orderIndex].op;
    let priority = global.orders[orderIndex].priority;
    let previousMessage = global.orders[orderIndex].msg;
    let priceLimit = global.orders[orderIndex].priceLimit ?? BUY_LIMIT;

    const confirmText = `${previousMessage}\nTransaction Confirmed by <a href="tg://user?id=${fromID}">${callbackObj.from.username}</a> & Done.`;

    // Force the timeout to run
    try {
        clearTimeout(global.orders[orderIndex].timeout); 
        await Promise.all(
            global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) =>
                editMessage({chat: chat_id, messageObj: message_id}, {messageText: confirmText, keyboard: {}}),
            )
        );
        if (op == "buy") {
            const { msg } = await liveBuyStockUpToLimit(symbol, priceLimit, priority);
            await Promise.all(
                global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) =>
                    sendMessage(chat_id, msg)
                )
            );
            //return sendMessage(authorizedId[0], msg);
        } else if (op == "sell") {
            const { msg } = await liveSellAllStock(symbol, priority);
            await Promise.all(
                global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) =>
                    sendMessage(chat_id, msg)
                )
            );
        } else if (op == "jump") {
            const { msg: msgSell } = await liveSellAllStock(symbol.symbolToSell, priority);
            const { msg: msgBuy } = await liveBuyStockUpToLimit(symbol.symbolToBuy, priceLimit, priority);
            await Promise.all(
                global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) => [
                    sendMessage(chat_id, msgSell),
                    sendMessage(chat_id, msgBuy)
                ])
            );
        }
    } catch (err) {
        console.log('LiveBot Confirm error:', err);
        return false;
    }

    // Remove it from the global.orders array
    global.orders.splice(orderIndex, 1);

    console.log(`Order with messageId ${messageId} confirmed and removed.`);
    return true;

}


// This is only used for ORDER CONFIRMATIONs.
export async function LiveBot_Delay(callbackObj) {

    let messageId = callbackObj.message.message_id;
    let messageText = callbackObj.message.text;
    let fromID = callbackObj.from.id;

    const orderIndex = global.orders.findIndex(order =>
        order.messageIds.some(
          msg => msg.chat_id === fromID && msg.message_id === messageId
        )
    );

    if (orderIndex === -1) {
        console.log(`No active order found for messageId: ${messageId}`);
        return false;
    }

    let symbol = global.orders[orderIndex].symbol;
    let op = global.orders[orderIndex].op;
    let previousMessage = global.orders[orderIndex].msg;

    const delayText = `${previousMessage}\nTransaction Delayed by <a href="tg://user?id=${fromID}">${callbackObj.from.username}</a>`;

    // Recall function in 1 minutes
    try {
        clearTimeout(global.orders[orderIndex].timeout);
        await Promise.all(
            global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) => (
                editMessage({chat: chat_id, messageObj: message_id}, {messageText: delayText, keyboard: {}}),
                sendMessage(chat_id, `🕒 Order ${symbol} / ${op} (${fromID} - ${messageId}) delayed for 2 minutes by user request.`)
            ))
        );
        const timeout = setTimeout(async () => {
            if (op == "buy") {
                LiveBot_Buy({symbol, time: 1}, {reason: 'Delayed action by user request', reasonText: `<i>User ${fromID} delayed buy order ${messageId}</i>`});
            } else if (op == "sell") {
                LiveBot_Sell({symbol, time: 1}, {reason: 'Delayed action by user request', reasonText: `<i>User ${fromID} delayed sell order ${messageId}</i>`});
            } else if (op == "jump") {
                LiveBot_Jump({symbolToBuy: symbol.symbolToBuy, symbolToSell: symbol.symbolToSell, time: 1}, {reason: 'Delayed action by user request', reasonText: `<i>User ${fromID} delayed sell order ${messageId}</i>`});
            }
        }, 60 * 1000); // 60 seconds = 1 minute
    } catch (err) {
        console.log('LiveBot Delay error:', err);
        return false;
    }


    // Remove it from the global.orders array
    global.orders.splice(orderIndex, 1);

    console.log(`Order with messageId ${messageId} delayed and removed.`);
    return true;

}


// This is ONLY for ORDER NOTIFICATIONs.
export async function LiveBot_RefreshNotification(callbackObj) {

    let messageId = callbackObj.message.message_id;
    let messageText = callbackObj.message.text;
    let fromID = callbackObj.from.id;

    //The global orders check is deleted, because this is a refresh function. We will get symbol
    //and operation from the text itself.

    let op;
    let symbol;
    let symbolToBuy;
    let symbolToSell;
    // Regex to find "BUY" or "SELL" after emojis and before "NOTIFICATION"
    // It looks for a word character (\w+) that is "BUY" or "SELL"
    const operationMatch = messageText.match(/(?:🔔🟢|🔔🔴|🔔🟡)\s*(BUY|SELL|JUMP)\s*NOTIFICATION/i);
    if (operationMatch && operationMatch[1]) {
        op = operationMatch[1].toUpperCase();
    }

    // Regex to find the symbol, which is typically a series of uppercase letters
    if (op !== "JUMP") {
        const symbolMatch = messageText.match(/^([A-Z0-9]+)\s*-/m); // 'm' flag for multiline
        if (symbolMatch && symbolMatch[1]) {
            symbol = symbolMatch[1];
        }
    } else {
        const jumpSymbolMatches = messageText.matchAll(/(?:🔸|🔹)\s([A-Z0-9]+)\s*-/g);
        for (const match of jumpSymbolMatches) {
            if (match[1]) {
                match[0].includes('🔸') ? symbolToSell = match[1] : symbolToBuy = match[1];
            }
        }
    }

    // Send a notification again.
    try {
        if (op == "BUY") {
            LiveBot_BuyNotify({symbol}, {reason: `Refreshed Notification`, reasonText: `Requested by user ${callbackObj.from.username} (${fromID})`});
        } else if (op == "SELL") {
            LiveBot_SellNotify({symbol}, {reason: `Refreshed Notification`, reasonText: `Requested by user ${callbackObj.from.username} (${fromID})`});
        } else if (op == "JUMP") {
            LiveBot_JumpNotify({symbolToBuy, symbolToSell}, {reason: `Refreshed Notification`, reasonText: `Requested by user ${callbackObj.from.username} (${fromID})`});
        }
    } catch (err) {
        console.log('LiveBot Refresh Notification error:', err);
        return false;
    }

    console.log(`Notification of ${symbolToBuy} - ${symbolToSell} (${op}) refreshed by ${fromID}.`);
    return true;

}


// This is ONLY for BYPASS CONFIRMATIONs. We handle all buttons.
export async function LiveBot_HandleBypassCallback(callbackObj, option) {

    let messageId = callbackObj.message.message_id;
    let messageText = callbackObj.message.text;
    let fromID = callbackObj.from.id;

    const orderIndex = global.orders.findIndex(order =>
        order.messageIds.some(
          msg => msg.chat_id === fromID && msg.message_id === messageId
        )
    );

    if (orderIndex === -1) {

        if (option === 'Restart') {

            const extractTone = (text) => {
                const firstLine = text.split('\n')[0].toUpperCase();
                if (firstLine.includes('MARKET BYPASS')) {
                    if (firstLine.includes('BEARISH')) return 'BEARISH';
                    if (firstLine.includes('BULLISH')) return 'BULLISH';
                }
                return null;
            };
            const extractDuration = (text) => {
                const match = text.match(/Duration:\s*(\d+)/i);
                return match ? parseInt(match[1]) : null;
            };
            
            const tone = extractTone(messageText);
            const duration = extractDuration(messageText);

            LiveBot_Bypass({duration, tone}, {reason: `Restarted Bypass Duration`, reasonText: `Requested by user ${callbackObj.from.username} (${fromID})`});
            return true;

        } else if (option === 'Stop') {

            const extractTone = (text) => {
                const firstLine = text.split('\n')[0].toUpperCase();
                if (firstLine.includes('MARKET BYPASS')) {
                    if (firstLine.includes('BEARISH')) return 'BEARISH';
                    if (firstLine.includes('BULLISH')) return 'BULLISH';
                }
                return null;
            };
            
            const tone = extractTone(messageText);

            const { msg } = await stopOverallBypass(tone);
            await Promise.all(
                authorizedId.map(async (id) => {
                    sendMessage(id, msg);
                })
            );
            return true;

        } else {  // Trying to click a buggy (non-existent) order
            console.log(`No active order found for messageId: ${messageId} / ${fromID}`);
            return false;
        }

    } else {

        let duration = global.orders[orderIndex].duration;
        let tone = global.orders[orderIndex].tone;
        let previousMessage = global.orders[orderIndex].msg;

        if (option === '0') {
            duration = duration + 1;
        } else if (option === '1') {
            duration = duration * 2;
        } else if (option === '3') {
            duration = duration / 2;
        } else if (option === '4') {
            duration = duration - 1;
        }

        try {

            const confirmText = `${previousMessage}\nBypass Confirmed by <a href="tg://user?id=${fromID}">${callbackObj.from.username}</a> & Done.`;
            clearTimeout(global.orders[orderIndex].timeout); 
            await Promise.all(
                global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) =>
                    editMessage({chat: chat_id, messageObj: message_id}, {messageText: confirmText, keyboard: {"inline_keyboard": [[{text: "Restart Bypass 🔄", callback_data: "IndicatorBypass-Restart"}],[{text: "Stop Bypass 🛑", callback_data: "IndicatorBypass-Stop"}]]}}),
                )
            );
            const { msg } = await addOverallBypass(duration, tone);
            await Promise.all(
                global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) =>
                    sendMessage(chat_id, msg)
                )
            );

            global.orders.splice(orderIndex, 1);
            return true;

        } catch (err) {
            console.log('LiveBot Confirm error:', err);
            return false;
        }



    }

}


// This is ONLY for CRITICAL HALT CONFIRMATION.
export async function LiveBot_CommenceCriticalHalt(callbackObj) {

    let messageId = callbackObj.message.message_id;
    let messageText = callbackObj.message.text;
    let fromID = callbackObj.from.id;

    //const orderIndex = global.orders.findIndex(o => o.messageId === messageId);
    const orderIndex = global.orders.findIndex(order =>
        order.messageIds.some(
          msg => msg.chat_id === fromID && msg.message_id === messageId
        )
    );

    if (orderIndex === -1) {
        console.log(`No active order found for messageId: ${messageId}`);
        return false;
    }

    let op = global.orders[orderIndex].op;
    let previousMessage = global.orders[orderIndex].msg;

    const confirmText = `${previousMessage}\nCommencing Confirmed by <a href="tg://user?id=${fromID}">${callbackObj.from.username}</a> & Done.`;

    // Force the timeout to run
    try {
        clearTimeout(global.orders[orderIndex].timeout); 
        await Promise.all(
            global.orders[orderIndex].messageIds.flatMap(({ chat_id, message_id }) =>
                editMessage({chat: chat_id, messageObj: message_id}, {messageText: confirmText, keyboard: {}}),
            )
        );
        const currentportfolio = await liveGetPortfolio();
        const ownedSymbols = new Set(currentportfolio.rawData.positions.map(pos => pos.symbol));
        for (const symbol of ownedSymbols) {
            const { msg } = await liveSellAllStock(symbol, 10);
            await Promise.all(
                global.orders[orderIndex].messageIds.map(({ chat_id, message_id }) => (
                    sendMessage(chat_id, msg)
                ))
            );
        }
        global.orders.splice(orderIndex, 1);
        console.log(`Order with messageId ${messageId} confirmed and removed.`);
        await waitUntilOrdersJsonIsEmpty();
        process.exit(1);
        return true;
        //return sendMessage(authorizedId[0], msg);

    } catch (err) {
        console.log('LiveBot Confirm error:', err);
        return false;
    }

}