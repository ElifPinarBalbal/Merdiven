import fs from 'fs';
import WebSocket from 'ws';
import crypto from 'crypto';
import axios from 'axios';

import { handleTradeMessage } from './buildcandle.js';
import { handleOrderMesssage } from './portfolio/connectQueues.js';

let logEnabled = false; // Flag to control logging


class ConnectionTimedOutException extends Error {
    constructor(message) {
        super(message);
        this.name = "ConnectionTimedOutException";
    }
}

class AlgoLabSocket {
    constructor(apiKey, hash) {
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.connected = false;
        this.apiKey = apiKey;
        this.hash = hash;
        this.hostname = "www.algolab.com.tr";
        this.apiHostname = `https://${this.hostname}`;
        this.socketUrl = `wss://${this.hostname}/api/ws`;
        this.data = `${this.apiKey}${this.apiHostname}/ws`;
        this.checker = crypto.createHash('sha256').update(this.data).digest('hex');
        this.headers = {
            "APIKEY": this.apiKey,
            "Authorization": this.hash,
            "Checker": this.checker
        };
        this.messageListeners = [];
        this.heartbeatInterval = null; 
        this.lastSubscribedData = null; 
    }

    async connect() {
        console.log("Establishing socket connection...");
        try {
            const response = await axios.get(this.apiHostname, { headers: this.headers });
            if (response.status === 200 || response.status === 302) {
                if (response.status === 302) {
                    const redirectUrl = response.headers.location;
                    console.log("Redirecting to:", redirectUrl);
                    this.socketUrl = redirectUrl;
                }
                return this.initializeWebSocket();
            }
        } catch (error) {
            console.log(`Connection Error: ${error}`);
            this.scheduleReconnect(); 
        }
    }

    initializeWebSocket() {
        return new Promise((resolve, reject) => {
            console.log("Connecting to WebSocket at:", this.socketUrl);
            this.ws = new WebSocket(this.socketUrl, { headers: this.headers });

            this.ws.on('open', () => {
                this.reconnectAttempts = 0; // Reset after successful reconnect
                this.connected = true;
                console.log("Socket connection established.");
                this.startHeartbeat(); 
                if (this.lastSubscribedData) { 
                    this.send(this.lastSubscribedData);
                }
                resolve();
            });

            this.ws.on('message', (data) => {
                this.messageListeners.forEach(listener => listener(data));
            });

            this.ws.on('error', (error) => {
                console.log(`Socket Error: ${error}`);
                this.close();
                this.scheduleReconnect(); // 🚀 ADDED
            });

            this.ws.on('close', () => { // 🚀 ADDED
                console.log('⚠️ WebSocket closed. Attempting reconnect...');
                this.close();
                this.scheduleReconnect();
            });
        });
    }

    // 🚀 ADDED
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const heartbeat = {
                    Type: "H",
                    Token: this.hash
                };
                try {
                    this.ws.send(JSON.stringify(heartbeat));
                } catch (err) {
                    console.log("❌ Heartbeat failed:", err.message);
                    this.close();
                    this.scheduleReconnect();
                }
            }
        }, 10000); // every 10 seconds
    }

    // 🚀 ADDED
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // 🚀 ADDED
    scheduleReconnect() {
        if (!this.connected) {
            this.reconnectAttempts++;
            console.log(`⏳ Reconnecting in 5 seconds... (Attempt ${this.reconnectAttempts}/3)`);
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.log("🛑 WebSocket failed after 3 attempts. Exiting for watchdog to restart...");
                process.exit(1); 
            }
            setTimeout(() => this.connect(), 5000);
        }
    }

    close() {
        this.connected = false;
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    onMessage(listener) {
        this.messageListeners.push(listener);
    }

    send(data) {
        this.lastSubscribedData = data;
        const payload = { token: this.hash, ...data };
        try {
            this.ws.send(JSON.stringify(payload));
            return true;
        } catch (error) {
            console.log("Send Error:", error);
            this.close();
            return false;
        }
    }
}

async function startWSS() {
    const apiKey = process.env.ALGOLAB_API_KEY;
    const hashData = JSON.parse(fs.readFileSync('./algolab/core/hash.json', 'utf8'));
    const hash = hashData.hash;

    // BIST-50 hisseleri
    
    const data = { Type: "T", Symbols: [
        "AEFES", "AGHOL", "AKBNK", "AKSA", "AKSEN", "ALARK", "ALFAS", "ALTNY", "ANSGR", "ARCLK",
        "ASELS", "ASTOR", "AVPGY", "BALSU", "BERA", "BIMAS", "BINHO", "BRSAN", "BRYAT", "BSOKE",
        "BTCIM", "CANTE", "CCOLA", "CIMSA", "CLEBI", "CWENE", "DOAS", "DOHOL", "DSTKF", "EFORC",
        "EGEEN", "EKGYO", "ENERY", "ENJSA", "ENKAI", "EREGL", "EUPWR", "FENER", "FROTO", "GARAN",
        "GENIL", "GESAN", "GLRMK", "GRSEL", "GRTHO", "GSRAY", "GUBRF", "HALKB", "HEKTS", "IEYHO",
        "IPEKE", "ISCTR", "ISMEN", "KCAER", "KCHOL", "KONTR", "KOZAA", "KOZAL", "KRDMD", "KTLEV",
        "KUYAS", "LMKDC", "MAGEN", "MAVI", "MGROS", "MIATK", "MPARK", "OBAMS", "ODAS", "OTKAR",
        "OYAKC", "PASEU", "PETKM", "PGSUS", "RALYH", "REEDR", "SAHOL", "SASA", "SISE", "SKBNK",
        "SMRTG", "SOKM", "TABGD", "TAVHL", "TCELL", "THYAO", "TKFEN", "TOASO", "TSKB", "TTKOM",
        "TTRAK", "TUPRS", "TUREX", "TURSG", "ULKER", "VAKBN", "VESTL", "YEOTK", "YKBNK", "ZOREN"
    ]};
    //const data2 = {Type: "O", Symbols: ["ALL"]};
    
    //const data = {Type:"T", Symbols: ["ALL"]};

    //const data = { Type: "T", Symbols: ["EURUSD"]};
    // "T" ve "D"  tipinde verilere abone olunabilir. "O" tipindeki veriler otomatik olarak gelmektedir. 
    // "T" anlık gerçekleşen her işlem için , "D" ise 20 kademe alım satım kademelerindeki değişimler ile veri gönderimi sağlamaktadır.
    // ALL değeri tüm sembolleri getirir liste içerisinde sadece abone olmak istediğiniz sembolleri de yazabilirsiniz. Örneğin:  "Symbols": ["ASELS","THYAO","TUPRS"]
    const soket = new AlgoLabSocket(apiKey, hash);

    // Await the connection
    try {
    await soket.connect();

    if (soket.connected) {
        soket.send(data);
        //soket.send(data2);
    }

    // Set up message listener
    soket.onMessage((receivedData) => {
        try {
            const msg = JSON.parse(receivedData);
            //handleTradeMessage(msg.Content);
            if (msg.Type === "T") {
                handleTradeMessage(msg.Content);
            }
            if (logEnabled || msg.Type === "O") {
                console.log("🔔 Message:", msg);
            }
        } catch (error) {
            console.log("Error parsing message:", error);
            soket.close();
        }
    });
    } catch (err) {
    console.log("❌ Failed to initialize WebSocket:", err.message || err);
    }
}

    function enableLogging() {
        logEnabled = true;
    }

    function disableLogging() {
        logEnabled = false;
      }

export { startWSS, enableLogging, disableLogging };

