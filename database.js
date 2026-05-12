const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

// Limpiador ultra-robusto de URL
let dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : null;
if (dbUrl) {
    // Buscar dónde empieza realmente la URL y descartar basura previa (comillas, espacios invisibles, etc)
    const match = dbUrl.match(/postgresql:\/\/.+/);
    if (match) {
        dbUrl = match[0].replace(/["']/g, ''); // Tomar desde postgresql:// y quitar comillas internas si existen
    }
}
const usePostgres = dbUrl && (dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com') || process.env.NODE_ENV === 'production');

let db;

if (usePostgres) {
  console.log('--- MODO PRODUCCIÓN: Conectando a Supabase ---');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Requerido para Supabase desde la mayoría de plataformas
    },
    connectionTimeoutMillis: 10000, // 10 segundos para fallar si no conecta
  });

  pool.on('error', (err) => {
    console.error('Error inesperado en el pool de Postgres:', err);
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
    async exec(sql) { 
      return await pool.query(sql); 
    }
  };
} else {
  console.log('--- MODO DESARROLLO: Usando SQLite Local ---');
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
      tickets TEXT
    );
  `;
  try {
    console.log('Iniciando tablas...');
    await db.exec(sql);
    console.log('✅ Base de datos lista y conectada.');
  } catch (err) {
    console.error('❌ Error crítico al iniciar la base de datos:', err.message);
    if (err.message.includes('SSL')) {
        console.error('Sugerencia: Revisa que la URL de Supabase termine en ?sslmode=require');
    }
  }
};

initDB();

module.exports = db;
