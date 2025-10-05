/*

This is the axios gate inside Bot Library.
The current structure is this:

(All Telegram handles + Functions) -> Telegram.js ->
axios.js -> (bot_main/index.js) -> (./index.js)

KNOWN BUGS & TODO:
[] - Telegram Limits: 20/m Groups - 30/s Overall - 1/s Individuals

*/

import axios from "axios";
import Bottleneck from 'bottleneck';

const BOT_TOKEN = process.env.TELEGRAM_BOT_API_KEY;

const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

// AUTHORIZED IDs
//const authorizedIds = process.env.TELEGRAM_AUTHORIZED_IDS.split(',').map(Number);

// Create a Bottleneck limiter (global rate limiter)
const limiter = new Bottleneck({
    minTime: 250, // at most 1 request every 250ms (≈ 4 requests/sec)
    maxConcurrent: 1,
});


function getAxiosInstance() {
    return {
        get(method, params) {
          return limiter.schedule(() =>
            axios.get(`/${method}`, {
              baseURL: BASE_URL,
              params,
            })
          );
        },
        post(method, data) {
          return limiter.schedule(() =>
            axios.post(`/${method}`, data, {
              baseURL: BASE_URL,
            })
          );
        },
    };
}

const axiosInstance = getAxiosInstance();

// Export it using named export syntax
export { axiosInstance };