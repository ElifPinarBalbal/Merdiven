import 'dotenv/config';
import fs from 'fs';
import API from './api.js';

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD
};

async function gunlukIslemler() {
  try {
    const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
    const hash = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8')).hash;
    const subAccount = process.env.ALGOLAB_SUB_ACCOUNT || "";

    const algo = new API({ ...config, token, hash });
    const info = await algo.post("/api/TodaysTransaction", { Subaccount: subAccount });

    const data = algo.error_check(info, "TodaysTransaction");
    return data; // <--- Return the parsed data here
  } catch (error) {
    console.log("❌ Unexpected error while fetching transactions:");
    console.log(error.message || error);
    throw error;
  }
}

export default gunlukIslemler;
