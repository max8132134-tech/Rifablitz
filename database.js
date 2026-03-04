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

module.exports = db;
