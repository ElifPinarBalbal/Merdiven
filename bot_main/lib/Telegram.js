/*

This is the main file for ALL TELEGRAM COMMAND / MESSAGE HANDLING + SENDING.

TODO & KNOWN BUGS:
[] - editMessage function has to be given a chat_id dynamically, which I give it manually during development.

*/

import { axiosInstance } from "./axios.js";
import { SimulationBot_Buy, SimulationBot_BuyNotify, SimulationBot_Cancel, SimulationBot_CommenceCriticalHalt, SimulationBot_Confirm, SimulationBot_CriticalHaltSellAll, SimulationBot_Delay, SimulationBot_HandleBypassCallback, SimulationBot_RefreshNotification, SimulationBot_Sell, SimulationBot_SellNotify } from "./simulationbot.js";
import { simulationBuyStock, simulationBuyStockUpToLimit, simulationGetPortfolio, simulationSellStock, simulationSellAllStock } from "../../simulation/lib/simulationService.js";
import { liveBuyStock, liveBuyStockUpToLimit, liveGetPortfolio, liveSellStock, liveSellAllStock } from "../../algolab/portfolio/lib/portfolioService.js";
import { LiveBot_Buy, LiveBot_BuyNotify, LiveBot_Bypass, LiveBot_Cancel, LiveBot_CommenceCriticalHalt, LiveBot_Confirm, LiveBot_CriticalHaltSellAll, LiveBot_Delay, LiveBot_HandleBypassCallback, LiveBot_Jump, LiveBot_JumpNotify, LiveBot_RefreshNotification, LiveBot_Sell, LiveBot_SellNotify } from "./livebot.js";
import { fetchLatestPrice } from "../../algolab/livePrice.js";

const authorizedIds = process.env.TELEGRAM_AUTHORIZED_IDS.split(',').map(Number);

// Send Normal Messages
async function sendMessage(messageObj, messageText) {

    let chatId;
    if (typeof messageObj === 'object' && messageObj !== null && ((messageObj.from && messageObj.from.id) || (messageObj.chat))) {
        chatId = messageObj.chat.id;
    }
    else if (typeof messageObj === 'number' || typeof messageObj === 'string') {
        chatId = messageObj;
    }

    try {
        const response = await axiosInstance.get("sendMessage", {
            chat_id: chatId,
            text: messageText,
            parse_mode: "HTML",
        });
        return {
            axiosResponse: response,
            messageId: response.data.result.message_id,
        };
    } catch (err) {
        console.log("Failed to send message:", err);
        console.log(chatId);
    }
}

// Send Order Confirmation with Inline Buttons
async function sendOrderConfirmationMessage(messageObj, messageText) {

    let chatId;
    if (typeof messageObj === 'object' && messageObj !== null && ((messageObj.from && messageObj.from.id) || (messageObj.chat))) {
        chatId = messageObj.chat.id;
    }
    else if (typeof messageObj === 'number' || typeof messageObj === 'string') {
        chatId = messageObj;
    }

    const keyboard = {
        "inline_keyboard": [
            [
                {text: "Cancel ❌", callback_data: "Cancel"},
                {text: "Delay 2 Min 🕒", callback_data: "Delay"}
            ],
            [
                {text: "Confirm Now ✅", callback_data: "Confirm"}
            ]
        ]
    };

    try {
        const response = await axiosInstance.get("sendMessage", {
            chat_id: chatId,
            text: messageText,
            reply_markup: JSON.stringify(keyboard),
            parse_mode: "HTML"
        });

        return {
            axiosResponse: response,
            messageId: response.data.result.message_id,
        };

    } catch (error) {
        console.log("Failed to send order confirmation message:", error);
        console.log(chatId);
        throw error;
    }
}

// Send Order as a Notification, with Inline Buttons
async function sendOrderNotificationMessage(messageObj, messageText) {

    let chatId;
    if (typeof messageObj === 'object' && messageObj !== null && ((messageObj.from && messageObj.from.id) || (messageObj.chat))) {
        chatId = messageObj.chat.id;
    }
    else if (typeof messageObj === 'number' || typeof messageObj === 'string') {
        chatId = messageObj;
    }

    const keyboard = {
        "inline_keyboard": [
            [
                {text: "Delete ❌", callback_data: "Cancel"},
            ],
            [
                {text: "Transact ✅", callback_data: "Confirm"}
            ]
        ]
    };

    try {
        const response = await axiosInstance.get("sendMessage", {
            chat_id: chatId,
            text: messageText,
            reply_markup: JSON.stringify(keyboard),
            parse_mode: "HTML"
        });

        return {
            axiosResponse: response,
            messageId: response.data.result.message_id,
        };

    } catch (error) {
        console.log("Failed to send order notification message:", error);
        console.log(chatId);
        throw error;
    }
}

// Send Bypass as a Confirmation, with Inline Buttons
async function sendBypassConfirmationMessage(messageObj, messageText) {

    let chatId;
    if (typeof messageObj === 'object' && messageObj !== null && ((messageObj.from && messageObj.from.id) || (messageObj.chat))) {
        chatId = messageObj.chat.id;
    }
    else if (typeof messageObj === 'number' || typeof messageObj === 'string') {
        chatId = messageObj;
    }

    const keyboard = {
        "inline_keyboard": [
            [
                {text: "Cancel ❌", callback_data: "Cancel"}
            ],
            [
                {text: "+1 🕑", callback_data: "IndicatorBypass-0"},
                {text: "x2 🕑", callback_data: "IndicatorBypass-1"},
                {text: "✅", callback_data: "IndicatorBypass-2"},
                {text: "÷2 🕑", callback_data: "IndicatorBypass-3"},
                {text: "-1 🕑", callback_data: "IndicatorBypass-4"},
            ]
        ]
    };

    try {
        const response = await axiosInstance.get("sendMessage", {
            chat_id: chatId,
            text: messageText,
            reply_markup: JSON.stringify(keyboard),
            parse_mode: "HTML"
        });

        return {
            axiosResponse: response,
            messageId: response.data.result.message_id,
        };

    } catch (error) {
        console.log("Failed to send bypass confirmation message:", error);
        console.log(chatId);
        throw error;
    }
}

// Send Bypass as a Confirmation, with Inline Buttons
async function sendCriticalHaltConfirmationMessage(messageObj, messageText) {

    let chatId;
    if (typeof messageObj === 'object' && messageObj !== null && ((messageObj.from && messageObj.from.id) || (messageObj.chat))) {
        chatId = messageObj.chat.id;
    }
    else if (typeof messageObj === 'number' || typeof messageObj === 'string') {
        chatId = messageObj;
    }

    const keyboard = {
        "inline_keyboard": [
            [
                {text: "Cancel ❌", callback_data: "Cancel"}
            ],
            [
                {text: 'Commence Now 💥', callback_data: 'CriticalHalt'}
            ]
        ]
    };

    try {
        const response = await axiosInstance.get("sendMessage", {
            chat_id: chatId,
            text: messageText,
            reply_markup: JSON.stringify(keyboard),
            parse_mode: "HTML"
        });

        return {
            axiosResponse: response,
            messageId: response.data.result.message_id,
        };

    } catch (error) {
        console.log("Failed to send critical halt confirmation message:", error);
        console.log(chatId);
        throw error;
    }
}


// Edit your own messages
async function editMessage({messageObj, chat = '-1002519960258'}, {messageText, keyboard}) {

    let chatId;
    if (typeof messageObj === 'object' && messageObj !== null && ((messageObj.from && messageObj.from.id) || (messageObj.chat))) {
        chatId = messageObj.chat.id;
    }
    else if (typeof messageObj === 'number' || typeof messageObj === 'string') {
        chatId = messageObj;
    }

    const newMessageText = messageText;
    const newKeyboard = keyboard;

    try {
        const response = await axiosInstance.get("editMessageText", {
            message_id: chatId,
            chat_id: chat,
            text: newMessageText,
            parse_mode: "HTML",
            reply_markup: JSON.stringify(newKeyboard),
        });
        
        return {
            axiosResponse: response,

        };
    } catch (err) {
        console.log("Failed to edit message:", err);
        console.log(chatId);
    }
}

// Handle recieved messages & commands
async function handleMessage(messageObj) {

    // Security whitelist
    const messageSender = messageObj.from ?? messageObj.sender_chat;

    console.log(messageSender);

    if (!authorizedIds.includes(messageSender.id)) {
        return sendMessage(messageObj, "You are not authorized to use me!");
    }


    // TEXT MESSAGE HANDLING

    const messageText = messageObj.text || "";
    if (!messageText) return;

    // COMMAND HANDLING

    if (messageText.charAt(0) === "/") {
        //const messageCommand = messageText.substr(1);

        const [command, ...args] = messageText.slice(1).split(/\s+/);

        switch(command) {
            
            case "start":
                return sendMessage(
                    messageObj,
                    "Hi! Bot is ready and running. How may I help?"
                );
            
            // The Simulation Commands
            
            case "simbuy": {
                const symbol = args[0] || "TCELL";
                return SimulationBot_Buy({symbol}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
            case "simsell": {
                const symbol = args[0] || "TCELL";
                const quantity = args[1] || 0;
                return SimulationBot_Sell({symbol, quantity}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }

            case "simnotifybuy": {
                const symbol = args[0] || "TCELL";
                return SimulationBot_BuyNotify({symbol}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
            case "simnotifysell" : {
                const symbol = args[0] || "TCELL";
                return SimulationBot_SellNotify({symbol}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }

            case "simcriticalhalt" : {
                //return SimulationBot_SellNotify({symbol}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
                return SimulationBot_CriticalHaltSellAll({time: 15}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
                
            case "simportfolio": {
                try {

                    const portfolio = await simulationGetPortfolio();
                    let portfolioMsg = `<i>- SIMULATION -</i>\n💼 <b><u>PORTFOLIO OVERVIEW</u></b> 💼\n\n`;


                    portfolioMsg += `<b>💰 Account Summary</b>\n${portfolio.summary}\n`;

                    // Add positions if they exist
                    if (portfolio.positions.length > 0) {
                        portfolioMsg += `<b>📦 Current Positions (${portfolio.positions.length})</b>\n`;
                        portfolioMsg += portfolio.positions.join('\n');
                    } else {
                        portfolioMsg += '\n⚠️ <b>No active positions</b>';
                    }
                    
                    // Add some helpful formatting
                    portfolioMsg = portfolioMsg.replace(/\.00/g, ''); // Clean up .00 decimals
                    portfolioMsg = portfolioMsg.replace(/\n{3,}/g, '\n\n'); // Remove extra newlines
                    
                    // Send through your Telegram interface
                    return sendMessage(messageObj, portfolioMsg);

                } catch(err) {
                    console.log('Portfolio command error:', err);
                    return sendMessage(messageObj, '❌ Error generating portfolio report');
                }

            }
            
            case "simbuyin": {
                const symbol = args[0] || "TCELL";
                const quantity = parseInt(args[1]) || 1;
                const { msg } = await simulationBuyStock(symbol, quantity);
                return sendMessage(messageObj, msg);
            }

            case "simbuylimitin": {
                const symbol = args[0] || "TCELL";
                const { msg } = await simulationBuyStockUpToLimit(symbol, 1000);
                return sendMessage(messageObj, msg);
            }

            case "simsellallin": {
                const symbol = args[0] || "TCELL";
                const { msg } = await simulationSellAllStock(symbol);
                return sendMessage(messageObj, msg);
            }

            case "simsellin": {
                const symbol = args[0] || "TCELL";
                const quantity = parseInt(args[1]) || 1;
                const { msg } = await simulationSellStock(symbol, quantity);
                return sendMessage(messageObj, msg);
            }


            case "buy": {
                const symbol = args[0] || "TCELL";
                return LiveBot_Buy({symbol, priority: 10}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
            case "sell": {
                const symbol = args[0] || "TCELL";
                const quantity = args[1] || 0;
                return LiveBot_Sell({symbol, priority: 10}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
            case "jump": {
                const symbolToSell = args[0] || "TCELL";
                const symbolToBuy = args[1] || "KCHOL";
                return LiveBot_Jump({symbolToBuy, symbolToSell, priority: 10}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }

            case "buynotify": {
                const symbol = args[0] || "TCELL";
                return LiveBot_BuyNotify({symbol}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
            case "sellnotify" : {
                const symbol = args[0] || "TCELL";
                return LiveBot_SellNotify({symbol}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
            case "jumpnotify": {
                const symbolToSell = args[0] || "TCELL";
                const symbolToBuy = args[1] || "KCHOL";
                return LiveBot_JumpNotify({symbolToBuy, symbolToSell}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }

            case "criticalhalt" : {
                //return SimulationBot_SellNotify({symbol}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
                return LiveBot_CriticalHaltSellAll({time: 15}, {reason: `User request by command`, reasonText: `${messageSender.username}`});
            }
                
            case "portfolio": {
                try {

                    const portfolio = await liveGetPortfolio();
                    let portfolioMsg = `💼 <b><u>PORTFOLIO OVERVIEW</u></b> 💼\n\n`;


                    portfolioMsg += `<b>💰 Account Summary</b>\n${portfolio.summary}\n`;

                    // Add positions if they exist
                    if (portfolio.positions.length > 0) {
                        portfolioMsg += `<b>📦 Current Positions (${portfolio.positions.length})</b>\n`;
                        portfolioMsg += portfolio.positions.join('\n');
                    } else {
                        portfolioMsg += '\n⚠️ <b>No active positions</b>';
                    }
                    
                    // Add some helpful formatting
                    portfolioMsg = portfolioMsg.replace(/\.00/g, ''); // Clean up .00 decimals
                    portfolioMsg = portfolioMsg.replace(/\n{3,}/g, '\n\n'); // Remove extra newlines
                    
                    // Send through your Telegram interface
                    return sendMessage(messageObj, portfolioMsg);

                } catch(err) {
                    console.log('Portfolio command error:', err);
                    return sendMessage(messageObj, '❌ Error generating portfolio report');
                }

            }

            case "price": {
                const symbol = args[0] || "TCELL";
                let msg = "";
                try {
                    msg = await fetchLatestPrice(symbol);
                } catch (err) {
                    msg = err;
                }
                return sendMessage(messageObj, msg);
            }
            
            default:
                return sendMessage(
                    messageObj,
                    "The command is unknown."
                ); 

        }
    } else {
        return sendMessage(messageObj, messageText);
    }
}

// Answer callback queries function 
function answerCallbackQueries(callbackid, message) {
    return axiosInstance.get("answerCallbackQuery", {
        callback_query_id: callbackid,
        text: message,
    });
}

// Handle recieved callback queries
async function handleCallbackQueries(callbackObj) {

    // Security Whitelist
    const querySender = callbackObj.from;

    if (!authorizedIds.includes(querySender.id)) {
        return sendMessage(querySender.id, "You are not authorized to use me!");
    }

    try {

        let success;
        let answermsg;
        let data = callbackObj.data;

        switch(true) {

            case data === "Cancel":
                (process.env.IS_LIVE) ?
                success = await LiveBot_Cancel(callbackObj) :
                success = await SimulationBot_Cancel(callbackObj);
                answermsg = "Canceled order.";
                break;
                
            case data === "Confirm":
                (process.env.IS_LIVE) ?
                success = await LiveBot_Confirm(callbackObj) :
                success = await SimulationBot_Confirm(callbackObj);
                answermsg = "Sending order right now.";
                break;

            case data === "Delay":
                (process.env.IS_LIVE) ?
                success = await LiveBot_Delay(callbackObj) :
                success = await SimulationBot_Delay(callbackObj);
                answermsg = "Delayed order for 2 minutes. Will notice again after 1 minute.";
                break;

            case data === "Refresh":
                (process.env.IS_LIVE) ?
                success = await LiveBot_RefreshNotification(callbackObj) :
                success = await SimulationBot_RefreshNotification(callbackObj);
                answermsg = "Refreshed notification.";
                break;

            case data.startsWith("IndicatorBypass-"):
                let option = data.substring("IndicatorBypass-".length);
                (process.env.IS_LIVE) ?
                success = await LiveBot_HandleBypassCallback(callbackObj, option) :
                success = await SimulationBot_HandleBypassCallback(callbackObj, option);
                answermsg = 'Successful interaction.';
                break;
            
            case data === 'CriticalHalt':
                (process.env.IS_LIVE) ?
                success = await LiveBot_CommenceCriticalHalt(callbackObj) :
                success = await SimulationBot_CommenceCriticalHalt(callbackObj);
                answermsg = 'Critical halt done.';
                break;

            // This is the "else" block
            default:
                success = false; // Or handle as you see fit
                answermsg = "Unknown or unhandled action.";
                console.log(`Unknown callback data received: ${data}`); // Good for debugging
                break;
        }

        if (!success) {
            answermsg = 'This order do not exist. Check console.';
        }
        return answerCallbackQueries(callbackObj.id, answermsg);
 
    } catch (err) {
        console.log('An error occurred during handleCallback:', err);
        return;
    }

}

export {
    sendMessage,
    handleMessage,
    handleCallbackQueries,
    sendOrderConfirmationMessage,
    sendOrderNotificationMessage,
    sendBypassConfirmationMessage,
    sendCriticalHaltConfirmationMessage,
    editMessage,
};