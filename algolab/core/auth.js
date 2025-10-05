import 'dotenv/config';
import fs from 'fs';
import API from './api.js';

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD
};

(async () => {
    try {
        const algo = new API(config);
        const login = await algo.LoginUser();

        if (login?.data?.content?.token) {
            fs.writeFileSync('./algolab/core/token.json', JSON.stringify({ token: login.data.content.token }), 'utf8');
            console.log("✅ Token saved");
        } else {
            console.log("❌ Login failed: token not found");
        }
    } catch (error) {
        console.log("❌ An unexpected error occurred in auth.js:");
        console.log(error.message || error);
    }
})();