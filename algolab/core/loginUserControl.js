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
        const token = JSON.parse(fs.readFileSync('./algolab/core/token.json', 'utf8')).token;
        const sms_code = JSON.parse(fs.readFileSync('./algolab/core/sms_code.json', 'utf8')).sms;

        const algo = new API({ ...config, token, sms_code });
        const userControl = await algo.LoginUserControl();

        if (userControl?.data?.content?.hash) {
            const hash = userControl.data.content.hash;
            fs.writeFileSync('./algolab/core/hash.json', JSON.stringify({ hash }), 'utf8');
            console.log("✅ Hash saved to hash.json");
        } else {
            console.log("❌ LoginUserControl failed: no hash returned.");
        }
    } catch (error) {
        console.log("❌ loginUserControl.js error:");
        console.log(error.message || error);
    }
})();