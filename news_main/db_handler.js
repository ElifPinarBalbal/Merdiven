/*
    After filter 1 (from Brainuşka) all news stored in their own company's database table!
    - Elif Pınar Balbal
*/


const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/* Load all BIST symbols from file - We used to check if it is a BIST company or not.
const bistSymbolsPath = path.join(__dirname, 'storage', 'bist_all_symbols.json');
const bistSymbols = JSON.parse(fs.readFileSync(bistSymbolsPath, 'utf-8'));
*/

const storageDir = path.join(__dirname, 'storage');

// Ensure the storage directory exists
fs.mkdirSync(storageDir, { recursive: true });

// DB file paths
const dbPath = path.join(storageDir, 'news.db');

// Open or create the SQLite databases
const newsdb = new Database(dbPath);

// ✅ Creates a table for a symbol if it doesn't exist
function ensureTableExists(symbol) {
    const tableName = symbol.replace(/[^a-zA-Z0-9_]/g, '_'); // sanitize

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            companySymbol TEXT,
            impactScore REAL,
            furtherInvestigationRequired REAL,
            explanation TEXT,
            news_title TEXT,
            news_description TEXT,
            news_content TEXT,
            news_link TEXT,
            confidence_score REAL,
            impact_tone TEXT,
            weighted_score REAL,
            impact_reasoning TEXT
        )
    `;

    newsdb.prepare(createTableSQL).run();
    return tableName;
}

// ✅ Inserts a news item into the correct table (max 10 entries)
function storeNews(
    {companySymbol, impactScore, furtherInvestigationRequired, explanation},
    {news_title, news_description, news_content, news_link},
    {confidence_score, impact_tone, weighted_score, impact_reasoning}) {
    const symbol = (companySymbol === 'Maybe' || companySymbol === 'No') ? 'OTHER' : companySymbol;
    try {
        const tableName = ensureTableExists(symbol);

        const insertSQL = `
            INSERT INTO ${tableName} (companySymbol, impactScore, furtherInvestigationRequired, explanation, news_title, news_description, news_content, news_link, confidence_score, impact_tone, weighted_score, impact_reasoning)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const stmt = newsdb.prepare(insertSQL);
        const result = stmt.run(companySymbol, impactScore, furtherInvestigationRequired, explanation, news_title, news_description, news_content, news_link, confidence_score, impact_tone, weighted_score, impact_reasoning);
        console.log(`✅ Saved to ${tableName} (id=${result.lastInsertRowid})`);

        // 🔁 Limit table to 1500 latest news - ARDA
        const deleteOldSQL = `
            DELETE FROM ${tableName}
            WHERE id NOT IN (
                SELECT id FROM ${tableName}
                ORDER BY timestamp DESC
                LIMIT 1500
            )
        `;

        newsdb.prepare(deleteOldSQL).run();

    } catch (error) {
        console.log('❌ NEWS DB Error:', error.message);
    }
}

// ✅ Fetch all stored news for a company
function getNews(company, duration = 0) {
    if (!company) return "No past news.";

    const tableName = company.replace(/[^a-zA-Z0-9_]/g, '_');

    // Check if table exists
    const tableExists = newsdb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
    `).get(tableName);

    if (!tableExists) return "No past news.";

    try {
        let stmt;
        if (duration > 0) {
            // Filter by timestamp within the last `duration` days
            stmt = newsdb.prepare(`
                SELECT news_title, news_description, news_link, weighted_score, timestamp
                FROM ${tableName}
                WHERE timestamp >= datetime('now', ?)
                ORDER BY timestamp DESC
                LIMIT 10
            `);
            const rows = stmt.all(`-${duration} days`);
            if (!rows.length) return "No past news.";
            return rows;
        } else {
            // No filtering by date
            stmt = newsdb.prepare(`
                SELECT news_title, news_description, news_link, weighted_score, timestamp
                FROM ${tableName}
                ORDER BY timestamp DESC
                LIMIT 10
            `);
            const rows = stmt.all();
            if (!rows.length) return "No past news.";
            return rows;
        }
    } catch (err) {
        console.log('❌ NEWS DB Error:', err.message);
        return "No past news.";
    }
}

module.exports = { storeNews, getNews };