/*
This file is where we keep our logs.
ALSO: We now fetch 60d every day until we build up to 360 days. 


*/
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');
const cron = require('node-cron');
const Database = require('better-sqlite3');

// ==========[ Config ]==========
const KEEP_DAYS = 360;

// 🔠 Add/extend this list yourself
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

// ==========[ Logging setup ]==========
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true });

const logStream = rfs.createStream('app.log', {
  interval: '1d',
  path: logDirectory,
  maxFiles: 3,
  compress: 'gzip',
});

const originalLog = console.log;
console.log = (...args) => {
  try {
    const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const ts = new Date().toISOString();
    logStream.write(`[${ts}] ${message}\n`);
    originalLog(...args);
  } catch (err) {
    originalLog('Logger error:', err);
  }
};

// ✅ Delete log files older than 3 days (but NEVER the DB files)
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
fs.readdir(logDirectory, (err, files) => {
  if (err) return;
  files.forEach(file => {
    if (file === 'market.db' || file === 'market.db-wal' || file === 'market.db-shm') return;
    const fp = path.join(logDirectory, file);
    fs.stat(fp, (err2, stats) => {
      if (err2) return;
      if (Date.now() - stats.mtimeMs > THREE_DAYS_MS) {
        fs.unlink(fp, (err3) => {
          if (!err3) originalLog(`🧹 Deleted old log: ${file}`);
        });
      }
    });
  });
});