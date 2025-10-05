import 'dotenv/config';
import fs from 'fs';
import API from './api.js';

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD
};

export async function subAccount() {
  try {
    console.log(`📂 [${new Date().toLocaleTimeString()}] Fetching Sub-Account info...`);
    const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
    const hash = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8')).hash;

    const algo = new API({ ...config, token, hash });
    const info = await algo.post("/api/GetSubAccounts", {});

    const data = algo.error_check(info, "GetSubAccounts");
    if (data) {
      console.log("✅ Sub-Accounts Retrieved.\n");
      //console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      console.log("❌ Failed to fetch sub-accounts.");
      return null;
    }
  } catch (error) {
    console.log("❌ Unexpected error while fetching sub-accounts:");
    console.log(error.message || error);
    return null;
  }
}
