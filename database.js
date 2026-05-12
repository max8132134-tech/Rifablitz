const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

let db;

// Intentar extraer los componentes de la URL manualmente para evitar errores de parsing
function parseDbUrl(url) {
    if (!url) return null;
    try {
        // Limpiar la URL de posibles comillas o espacios
        const cleanUrl = url.trim().replace(/["']/g, '');
        // Buscar el patrón: postgresql://usuario:password@host:port/database
        const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
        const match = cleanUrl.match(regex);
        
        if (match) {
            return {
                user: match[1],
                password: match[2],
                host: match[3],
                port: parseInt(match[4]),
                database: match[5]
            };
        }
    } catch (e) {
        console.error('Error al parsear URL:', e.message);
    }
    return null;
}

const dbComponents = parseDbUrl(process.env.DATABASE_URL);

if (dbComponents) {
  console.log('--- MODO PRODUCCIÓN: Conectando a Supabase (Manual) ---');
  console.log(`Conectando a: ${dbComponents.host}:${dbComponents.port}`);

  const pool = new Pool({
    user: dbComponents.user,
    password: dbComponents.password,
    host: dbComponents.host,
    port: dbComponents.port,
    database: dbComponents.database,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
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
    async exec(sql) { return await pool.query(sql); }
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
    console.log('✅ Base de datos lista.');
  } catch (err) {
    console.error('❌ Error crítico:', err.message);
  }
};

initDB();
module.exports = db;
