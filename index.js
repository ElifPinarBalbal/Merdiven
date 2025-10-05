const express = require("express");
const ngrok = require("@ngrok/ngrok");
const axios = require("axios");
const fs = require('fs');

// This is to prevent EC2 from losing .env every time we upload.
require('dotenv').config(); // loads .env in root
require('dotenv').config({ path: '/.env' }); // loads custom file (overrides if overlapping keys)
require('dotenv').config({ path: '../.env' }); // loads custom file (overrides if overlapping keys)

const { handler } = require("./bot_main");
const PORT = 4040;
require("./simulation_db");
require("./portfolio_db");
//require('./logger');

const { runAlgoLabSession } = require('./algolab/app.js');


// Initialize PD RSS fetching
const { runPDSession } = require("./news_main/pd_rss_reader/index");

const app = express();
app.use(express.json());
app.post("/{*splat}", async(req, res) => {
    console.log(req.body);
    res.send(await handler(req));
});
app.get("/{*splat}", async(req, res) => {
    res.send(await handler(req));
});

app.listen(PORT, function(err) {
    if (err) console.log(err);
    console.log("Server listening on PORT", PORT);


    // NGROK (Delete after EC2) - Arda
    
    (async function() {
        try {
            const ngrokURL = await ngrok.forward({addr: 4040, authtoken_from_env: true});
            console.log("Ngrok connected to", ngrokURL.url());

            setTimeout(async () => {
                try {
                    const response = await axios.get(
                        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_API_KEY}/setWebhook`,
                        {params: {url: `${ngrokURL.url()}`}}
                    );
                    console.log("Telegram Webhook is set:", response.data);
                } catch(err) {
                    console.log("Webhook setup failed:", err);
                }
            }, 3000);

        } catch (err) {
            console.log("Ngrok connection failed:", err)
        }
    }) ();
    runPDSession();
    runAlgoLabSession();
});
