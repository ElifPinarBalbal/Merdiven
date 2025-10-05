import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import { startWSS, enableLogging, disableLogging } from './wss.js';
import {check15Mins} from './portfolio/connectQueues.js';
import { addRequest, startQueueRunner, getQueue } from './portfolio/requestsQueue.js';

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close();
      resolve(ans);
    });
  });
}


async function runScript(script, args = []) {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [script, ...args], { stdio: 'inherit' });
        proc.on('close', resolve);
        proc.on('error', reject);
    });
}


async function main() {
    console.log("🔐 Logging in...");
    await runScript('./algolab/core/auth.js');

    const sms = await ask("📲 Enter SMS code: ");
    fs.writeFileSync('./algolab/core/sms_code.json', JSON.stringify({ sms }), 'utf8');

    // Pass SMS code to loginUserControl
    process.env.SMS_CODE = sms;
    await runScript('./algolab/core/loginUserControl.js');

    console.log("‼️ IS IN LIVE MODE: Sync with database");
    if (process.env.IS_LIVE) {
        addRequest('CASH_CHECK');
        addRequest('PORTFOLIO_CHECK');
        startQueueRunner();
    }

    // Start auto refresh every 60 seconds
    console.log("🔁 Starting session refresher...");

    setInterval(async () => {
        try {
            await runScript('./algolab/core/refresh.js');
            console.log("✅ Session refreshed.");
        } catch (err) {
            console.log("❌ SessionRefresh() failed:", err.message || err);
        }

        // 15 min check
        try{
            await check15Mins();
        } catch (err) {
            console.log("❌ check15Mins() failed:", err.message || err);
        }

        if (process.env.IS_LIVE) {
            addRequest('CASH_CHECK');
            addRequest('PORTFOLIO_CHECK');
            startQueueRunner();
        }

        // Force re-render prompt
        process.stdout.write("\n👉 Waiting for your command...\n> ");
    }, 60 * 1000);
    console.log("Refreshed");

    // 🔁 Run WebSocket immediately (in background)
    await startWSS();

    // Menu loop
    while (true) {
        const command = await ask(`
🎛 What do you want to do?
- Press [w] to enable WSS console output
- Press [e] to exit
- Press [o] to send order
- Press [c] to cancel an order
- Press [s] to stop WSS output
- Press [h] to fetch Risk Simulation (Hisse Bilgisi)
- Press [sa] to fetch SubAccount Info
- Press [g] to fetch Hisse Günlük İşlemler
- Press [p] to fetch Hisse Portföy Bilgisi
> `);

        
        if (command === 'w') {
            console.log("📡 WSS logging enabled!");
            enableLogging();
        } 
        else if (command === 's') {
            console.log("🔇 WSS logging DISABLED");
            disableLogging();
        }
        else if (command === 'o') {
            console.log("🚀 Running finalTest.js to place predefined test orders...");
            await runScript('./algolab/portfolio/finalTest.js');
        }
        else if (command === 'c') {
            console.log("🛑 Running cancelTest.js to cancel one order...");
            await runScript('./algolab/core/cancelTest.js');
        }
        else if (command === 'h') {
            console.log("📈 Running hisse.js to fetch risk simulation data...");
            await runScript('./algolab/core/hisseOzeti.js');
        }
        else if (command === 'sa') {
            console.log("📈 Running SubAccount!!!");
            await runScript('./algolab/core/subAccount.js');
        }
        else if (command === 'g') {
            console.log("📈 Running Hisse Günlük İşlemler");
            await runScript('./algolab/core/gunlukIslemler.js');
        }
        else if (command === 'p') {
            console.log("📦 Running Hisse Portföy Bilgisi");
            await runScript('./algolab/core/portfoyBilgisi.js');
        }
        else if (command === 'e') {
            console.log("👋 Exiting...");
            process.exit(0);
        }else {
            console.log("❓ Unknown command.");
        }
    }
}

//main();

async function runAlgoLabSession() {
    await main();
}

export { runAlgoLabSession };