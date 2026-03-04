const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.resolve(__dirname, 'rifas.db');
const db = new Database(dbPath);

// 1. Create Initial Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS raffles (
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    ownerName TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    ticketPrice REAL NOT NULL,
    totalTickets INTEGER NOT NULL,
    drawDate TEXT NOT NULL,
    imageUrl TEXT,
    status TEXT DEFAULT 'active',
    winnerId TEXT,
    winnerName TEXT,
    winnerTicket INTEGER,
    createdAt TEXT NOT NULL,
    tickets JSON,
    FOREIGN KEY (ownerId) REFERENCES users (id)
  );
`);

// 2. Migrations (Ensure columns exist for older DB versions)
const columns = db.prepare("PRAGMA table_info(raffles)").all().map(c => c.name);

const requiredColumns = [
  { name: 'ownerName', type: 'TEXT NOT NULL DEFAULT "Admin"' },
  { name: 'drawDate', type: 'TEXT NOT NULL DEFAULT ""' },
  { name: 'ticketPrice', type: 'REAL NOT NULL DEFAULT 0' },
  { name: 'totalTickets', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'tickets', type: 'JSON' },
  { name: 'imageUrl', type: 'TEXT' },
  { name: 'winnerId', type: 'TEXT' },
  { name: 'winnerName', type: 'TEXT' },
  { name: 'winnerTicket', type: 'INTEGER' }
];

requiredColumns.forEach(col => {
  if (!columns.includes(col.name)) {
    try {
      db.exec(`ALTER TABLE raffles ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Migration: Added column ${col.name} to raffles table`);
    } catch (e) {
      console.error(`Migration error on column ${col.name}:`, e.message);
    }
  }
});

module.exports = db;
