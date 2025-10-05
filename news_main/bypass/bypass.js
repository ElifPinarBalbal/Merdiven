import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

import { simulationGetPortfolio } from '../../simulation/lib/simulationService.js';
import { liveGetPortfolio } from '../../algolab/portfolio/lib/portfolioService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BYPASS_FILE = path.join(__dirname, '..', 'storage', 'bypass.json');

// BIST-100 list
const BIST100 = [
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
];

// Adding Bypass function to the symbol that passed the AI filters
export function addBypass(symbol, duration) {
    cleanExpiredBypasses();

    // 🔐 Parse and validate duration
    const hours = parseFloat(duration);
    if (isNaN(hours) || hours <= 0) {
      console.log(`❌ Invalid duration "${duration}". Must be a positive number.`);
      return;
    }

    const now = new Date();
    const expireDate = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Ensure file exists
    if (!fs.existsSync(BYPASS_FILE)) {
        fs.writeFileSync(BYPASS_FILE, '[]', 'utf-8');
    }

    // Read and parse
    const raw = fs.readFileSync(BYPASS_FILE, 'utf-8');
    let bypassList = [];

    try {
        bypassList = JSON.parse(raw);
        if (!Array.isArray(bypassList)) throw new Error("Bypass file is corrupted.");
    } catch (err) {
        console.log('❌ Failed to parse bypass file:', err.message);
        return;
    }

    // Check if symbol exists
    const symbolExists = bypassList.find(entry => entry.symbol === symbol);

    if (symbolExists) {
        // Update the expiry
        symbolExists.expires_at = expireDate.toISOString();
    } 
    else {
        // Add new entry
        bypassList.push({
        symbol,
        expires_at: expireDate.toISOString()
        });
    }

    // Save back to file
    fs.writeFileSync(BYPASS_FILE, JSON.stringify(bypassList, null, 2));
    console.log(`✅ Bypass added/updated for ${symbol} until ${expireDate.toISOString()}`);
}

// To check whether the given symbol is Bypassed or not
export function isBypassed(symbol) {
  if (!fs.existsSync(BYPASS_FILE)) return false;

  const raw = fs.readFileSync(BYPASS_FILE, 'utf-8');
  let bypassList = [];

  try {
    bypassList = JSON.parse(raw);
    if (!Array.isArray(bypassList)) throw new Error("Bypass file is corrupted.");
  } catch (err) {
    console.log('❌ Failed to parse bypass file:', err.message);
    return false;
  }

  const now = new Date();

  return bypassList.some(entry =>
    entry.symbol === symbol &&
    new Date(entry.expires_at) > now
  );
}

// Clean expired entries that bypassed
export function cleanExpiredBypasses() {
  if (!fs.existsSync(BYPASS_FILE)) return;

  const raw = fs.readFileSync(BYPASS_FILE, 'utf-8');
  let bypassList = [];

  try {
    bypassList = JSON.parse(raw);
    if (!Array.isArray(bypassList)) throw new Error("Bypass file is corrupted.");
  } catch (err) {
    console.log('❌ Failed to parse bypass file:', err.message);
    return;
  }

  const now = new Date();
  const cleaned = bypassList.filter(entry => new Date(entry.expires_at) > now);

  fs.writeFileSync(BYPASS_FILE, JSON.stringify(cleaned, null, 2));
  //console.log(`🧹 Cleaned bypass list. ${bypassList.length - cleaned.length} entries removed.`);
}

function removeBypass(symbol) {
  if (!fs.existsSync(BYPASS_FILE)) {
    console.log(`⚠️ Bypass file not found. No action taken for ${symbol}.`);
    return;
  }

  const raw = fs.readFileSync(BYPASS_FILE, 'utf-8');
  let bypassList = [];

  try {
    bypassList = JSON.parse(raw);
    if (!Array.isArray(bypassList)) throw new Error("Bypass file is corrupted.");
  } catch (err) {
    console.log('❌ Failed to parse bypass file:', err.message);
    return;
  }

  const originalLength = bypassList.length;
  bypassList = bypassList.filter(entry => entry.symbol !== symbol);

  if (bypassList.length === originalLength) {
    console.log(`ℹ️ No bypass entry found for ${symbol}.`);
    return;
  }

  fs.writeFileSync(BYPASS_FILE, JSON.stringify(bypassList, null, 2));
  console.log(`🗑️ Bypass removed for ${symbol}.`);
}


/*
This part is where I have added the
BULLISH & BEARISH bypass:

BULLISH Bypass: All OWNED stocks are bypassed
BEARISH Bypass: All UNOWNED stocks are bypassed.
*/

export async function addOverallBypass(duration, tone) {

  try {

    let portfolio;
    (process.env.IS_LIVE) ? portfolio = await liveGetPortfolio() : portfolio = await simulationGetPortfolio();
    const ownedSymbols = portfolio.rawData.positions.map(pos => pos.symbol);

    if (tone === 'BEARISH') {
      // Loop through BIST100 and call addBypass for stocks not owned
      for (const symbol of BIST100) {
        if (!ownedSymbols.includes(symbol)) {
          addBypass(symbol, duration);  // Replace `duration` with your actual duration value
        }
      }
    } else if (tone === 'BULLISH') {
      // Loop through BIST100 and call addBypass for stocks not owned
      for (const symbol of BIST100) {
        if (ownedSymbols.includes(symbol)) {
          addBypass(symbol, duration);  // Replace `duration` with your actual duration value
        }
      }
    }

    return { success: true, msg: `✅ Overall ${tone} BYPASS added for (${duration}) hours.` };

  } catch (err) {

    console.log('An error occurred while applying overall bypass:', err);
    return { success: false, msg: `❌ An error occurred: ${err}` };
  }
}

export async function stopOverallBypass(tone) {

  try {

    let portfolio;
    (process.env.IS_LIVE) ? portfolio = await liveGetPortfolio() : portfolio = await simulationGetPortfolio();
    const ownedSymbols = portfolio.rawData.positions.map(pos => pos.symbol);

    if (tone === 'BEARISH') {
      // Loop through BIST100 and call addBypass for stocks not owned
      for (const symbol of BIST100) {
        if (!ownedSymbols.includes(symbol)) {
          removeBypass(symbol);  // Replace `duration` with your actual duration value
        }
      }
    } else if (tone === 'BULLISH') {
      // Loop through BIST100 and call addBypass for stocks not owned
      for (const symbol of BIST100) {
        if (ownedSymbols.includes(symbol)) {
          removeBypass(symbol);  // Replace `duration` with your actual duration value
        }
      }
    }

    return { success: true, msg: `✅ Overall ${tone} BYPASS STOPPED.` };
    
  } catch (err) {
    console.log('An error occurred while removing overall bypass:', err);
    return { success: false, msg: `❌ An error occurred: ${err}` };
  }

}
