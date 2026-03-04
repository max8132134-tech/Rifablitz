const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.resolve(__dirname, 'rifas.db');
const db = new Database(dbPath);

// Create tables
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
    title TEXT NOT NULL,
    description TEXT,
    ticketPrice REAL NOT NULL,
    totalTickets INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    createdAt TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users (id)
  );
`);

module.exports = db;
