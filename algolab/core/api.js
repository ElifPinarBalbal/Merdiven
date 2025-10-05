/**
 * The common API class definition for Algolab to handle token, sms_code and hash.
 * - Elif Pınar Balbal
 */

import axios from 'axios';
import crypto from 'crypto';
class API {
    constructor({api_key, username, password, token = null, sms_code = null, hash = null})  {
        try {
            this.api_code = api_key.split("-")[1];
        } catch (e) {
            this.api_code = api_key;
        }
        this.api_key = `API-${this.api_code}`;
        this.username = username;
        this.password = password;
        this.token = token;
        this.sms_code = sms_code;
        this.hash = hash;
        this.api_hostname = "https://www.algolab.com.tr";
        this.api_url = this.api_hostname + "/api";
        this.headers = { "APIKEY": this.api_key };
        this.last_request = 0;
        this.LOCK = false;
    }

    async post(endpoint, payload, login = false) {
        const url = this.api_url + endpoint;                        // build the full request url
        let headers = login
            ? { "APIKEY": this.api_key }                            // If login = true ==> basic login with API key
            : {                                                     // Authenticated request
                "APIKEY": this.api_key,
                "Checker": this.make_checker(endpoint, payload),    // adds checker (SHA-256 signature) 
                "Authorization": this.hash                          // JWT style token
            };
        return await this._request("POST", url, payload, headers);  // Enforces 5-second delay 
    }

     make_checker(endpoint, payload) {
            const body = Object.keys(payload).length > 0 ? JSON.stringify(payload).replace(/\s+/g, '') : "";
            const data = this.api_key + this.api_hostname + endpoint + body;
            return crypto.createHash('sha256').update(data).digest('hex');
    }

    error_check(resp, funcName, silent = false) {
        try {
            if (resp.status === 200) {
                return resp.data;
            }
            if (!silent) {
                console.log(`Error kodu: ${resp.status}`);
                console.log(resp.data);
            }
            return false;
        } catch (e) {
            if (!silent) {
                console.log(`${funcName}() fonksiyonunda veri tipi hatası. Veri, json formatından farklı geldi:`);
                console.log(resp.data);
            }
            return false;
        }
    }

    async _request(method, url, payload, headers) {
        // Prevents overlapping requests with a simple lock
        while (this.LOCK) {
            await new Promise(resolve => setTimeout(resolve, 100)); // waits 100ms
        }

        this.LOCK = true;
        try {
            let response;

            if (method === "POST") {
                const now = Date.now(); // current time in ms
                const diff = now - this.last_request;

                const mustWait = this.last_request > 0 && diff < 5000;
                if (mustWait) {
                    const waitTime = 5000 - diff + 100; // wait extra 100ms for safety
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                response = await axios.post(url, payload, { headers });
                this.last_request = Date.now(); // update timestamp
            }
            return response;
        } finally {
            this.LOCK = false;
        }
    }

     encrypt(text) {
        const iv = Buffer.alloc(16, 0);
        const key = Buffer.from(this.api_code, 'base64');
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        return cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
    }

    async LoginUser() {
        const payload = {
            username: this.encrypt(this.username),
            password: this.encrypt(this.password),
        };
        return await this.post("/api/LoginUser", payload, true);
    }

    async LoginUserControl() {
        const payload = {
            token: this.encrypt(this.token),
            password: this.encrypt(this.sms_code),
        };
        return await this.post("/api/LoginUserControl", payload, true);
    }

    async SessionRefresh() {
        try {
        const response = await this.post("/api/SessionRefresh", {});
        //return response?.status === 200 ? response.data : false;
        return this.error_check(response, "SessionRefresh");
        } catch(error){
            console.log("❌ API call failed in SessionRefresh():", error.message || error);
            return false;
        }
    }

    async SendOrder({ symbol, direction, pricetype, price, lot, sms, email, subAccount }) {
        const payload = {
            symbol,
            direction,
            pricetype,
            price,
            lot,
            sms,
            email,
            subAccount
        };

        const response = await this.post("/api/SendOrder", payload);
        return this.error_check(response, "SendOrder");
    }

    async DeleteOrder({ id, subAccount }) {
        const payload = { id, subAccount };
        const response = await this.post("/api/DeleteOrder", payload);
        return this.error_check(response, "DeleteOrder");
    }
}
export default API;