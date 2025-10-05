//const Database = require('better-sqlite3');
import Database from 'better-sqlite3';
const db = new Database('portfolio.db');

// Create tables if they don't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS portfolio (
    symbol TEXT PRIMARY KEY,
    quantity INTEGER,
    avgPrice REAL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    symbol TEXT,
    quantity INTEGER,
    price REAL,
    date TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS cash (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    balance REAL
  )
`).run();

// Initialize with 0 TRY.
const cashExists = db.prepare("SELECT * FROM cash WHERE id = 1").get();
if (!cashExists) {
  db.prepare("INSERT INTO cash (id, balance) VALUES (1, ?)").run(0);
}

export { db };