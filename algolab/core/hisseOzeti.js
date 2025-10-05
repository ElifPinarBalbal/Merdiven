import 'dotenv/config';
import fs from 'fs';
import API from './api.js';

const config = {
  api_key: process.env.ALGOLAB_API_KEY,
  username: process.env.ALGOLAB_USERNAME,
  password: process.env.ALGOLAB_PASSWORD
};

console.log(`📊 [${new Date().toLocaleTimeString()}] Fetching Risk Simulation info...`);

(async () => {
    try {
        const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
        const hash = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8')).hash;
        const subAccount = ""; 

        const algo = new API({ ...config, token, hash });
        const info = await algo.post("/api/RiskSimulation", { Subaccount: subAccount });

        const data = algo.error_check(info, "RiskSimulation");
        if (data) {
            console.log("✅ Risk Simulation Data:\n");
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log("❌ Failed to fetch risk simulation data.");
        }
    } catch (error) {
        console.log("❌ Unexpected error while fetching risk simulation:");
        console.log(error.message || error);
        process.exit(1);
    }
})();
