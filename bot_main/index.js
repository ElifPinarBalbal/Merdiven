const {handleMessage} = require("./lib/Telegram");
const {handleCallbackQueries} = require("./lib/Telegram");

async function handler(req, method) {
    const {body} = req;

    if (body?.callback_query) {
        const callbackObj = body.callback_query;
        await handleCallbackQueries(callbackObj);
    }

    if (body?.message) {
        const messageObj = body.message;
        await handleMessage(messageObj);
    }

    if (body?.channel_post) {
        const messageObj = body.channel_post;
        await handleMessage(messageObj);
    }

    return;
}

module.exports = {handler}