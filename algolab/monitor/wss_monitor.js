/*

This is the health monitor for WSS connection
(sometimes, although it successfully sends heartbeat - while session refresh also works)
WSS can stop sending live trade data. Thus, this mechanism shuts down the bot
for a fresh restart.

*/

import { isBISTopen } from "../../misc/bistStatus.js";


let timer = null;
let reopenTimer = null;
let logTimer = new Date(0); // prevent log spam
let isScheduled = false; // prevent call schedule spam
const TIMEOUT_MS = 300 * 1000; // seconds

export async function wssMessagesAreAlive() {
    // Clear existing timer
    if (timer) clearTimeout(timer);

    let { isOpen, dateAtOpen } = await isBISTopen({isfromWSS: true});
    //console.log(isOpen, dateAtOpen);

    if (isOpen) {

        isScheduled = false;

        // Start a new 60s timer
        timer = setTimeout(async () => {
            console.log("❌🛑 No trade messages received in 60s...");
            let { isOpen } = await isBISTopen({isfromWSS: true});
            if (isOpen) {
                console.log("Market is open - shutting down.");
                process.exit(1);
            } else {
                console.log("Market is not open. Calling the function again.");
                wssMessagesAreAlive();
            }
        }, TIMEOUT_MS);

    } else if (dateAtOpen && dateAtOpen > new Date() && !isScheduled) {

        // Schedule a self-call exactly at dateAtOpen
        const delay = dateAtOpen.getTime() - Date.now();
        isScheduled = true;
    
        // Safety: Node.js setTimeout max ~24.8 days
        if (delay > 0 && delay < 2 ** 31 - 1) {
            if ((((new Date()) - logTimer) / (1000)) >= 1) {
                console.log("⏰ WSS health monitor is waiting for trading to open:", dateAtOpen);
                logTimer = new Date();
            }
            reopenTimer = setTimeout(() => {
                if ((((new Date()) - logTimer) / (1000)) >= 1) {
                    console.log("⏰ Market scheduled to open, re-checking...");
                    logTimer = new Date();
                }
                wssMessagesAreAlive();
                isScheduled = false;
            }, delay);
        } else {
            console.log("⚠️ dateAtOpen too far in future for setTimeout, skipping scheduling.");
            isScheduled = false;
        }
    }
}


  
// On first launch - call first.
wssMessagesAreAlive();