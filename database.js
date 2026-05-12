const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// Determinar qué base de datos usar (Por defecto SQLite localmente)
const isProduction = process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co'));
const usePostgres = isProduction && process.env.DATABASE_URL;

let db;

if (usePostgres) {
  console.log('--- MODO PRODUCCIÓN: Usando PostgreSQL (Supabase) ---');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  db = {
    prepare(sql) {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      return {
        async get(...params) {
          const res = await pool.query(pgSql, params);
          return res.rows[0];
        },
        async run(...params) {
          const res = await pool.query(pgSql, params);
          return { changes: res.rowCount };
        },
        async all(...params) {
          const res = await pool.query(pgSql, params);
          return res.rows;
        }
      };
    },
    async exec(sql) { return await pool.query(sql); }
  };
} else {
  console.log('--- MODO DESARROLLO: Usando SQLite Local (rifas.db) ---');
  const sqlite = new Database(path.resolve(__dirname, 'rifas.db'));
  
  db = {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      return {
        async get(...params) { return stmt.get(...params); },
        async run(...params) { return stmt.run(...params); },
        async all(...params) { return stmt.all(...params); }
      };
    },
    async exec(sql) { return sqlite.exec(sql); }
  };
}

// Inicialización de tablas
const initDB = async () => {
  const sql = `
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
      tickets TEXT,
      FOREIGN KEY (ownerId) REFERENCES users (id)
    );
  `;
  try {
    await db.exec(sql);
    console.log('Base de datos lista.');
  } catch (err) {
    console.error('Error al iniciar tablas:', err);
  }
};

initDB();

module.exports = db;
