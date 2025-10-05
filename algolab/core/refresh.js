/**
 * - Elif Pınar Balbal
 */

import 'dotenv/config';
import fs from 'fs';
import API from './api.js';

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD
};

console.log(`🕒 [${new Date().toLocaleTimeString()}] Refreshing session...`);

(async () => {
    try {
        const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
        const hash = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8')).hash;

        const algo = new API({ ...config, token, hash });
        const info = await algo.SessionRefresh();

        if (info) {
            console.log("✅ Session refresh successful!\n");
        } else {
            console.log("❌ Session refresh failed! Exiting the bot to allow watchdog to restart...\n");
            process.exit(1);
        }
    } catch (error) {
        console.log("❌ Unexpected error during session refresh:");
        console.log(error.message || error);
        process.exit(1);
    }
})();