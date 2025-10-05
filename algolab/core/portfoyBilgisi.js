import 'dotenv/config';
import fs from 'fs';
import API from './api.js';

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD
};

export async function portfoyBilgisi() {
  try {
    console.log(`📦 [${new Date().toLocaleTimeString()}] Fetching Instant Position (Hisse Portföy Bilgisi)...`);
    const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
    const hash = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8')).hash;
    const subAccount = process.env.ALGOLAB_SUB_ACCOUNT || "";
    const algo = new API({ ...config, token, hash });

    const payload = { Subaccount: subAccount };

    const info = await algo.post("/api/InstantPosition", payload);
    const data = algo.error_check(info, "InstantPosition");

    if (data) {
      console.log("✅ Instant Position Data received.\n");
      return data;
    } else {
      console.log("❌ Failed to fetch instant position.");
      return null;
    }

  } catch (error) {
    console.log("❌ Unexpected error while fetching instant position:");
    console.log(error.message || error);
    return null;
  }
}
