const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDb() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    console.log('Using PostgreSQL Database (Supabase)...');
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    await pool.query('SELECT NOW()');

    // Helper to convert SQLite ? to PostgreSQL $1, $2...
    function convertSql(sql) {
      let count = 1;
      return sql.replace(/\?/g, () => `$${count++}`);
    }

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        daily_salary NUMERIC NOT NULL,
        ot_rate NUMERIC NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date VARCHAR(10) NOT NULL,
        status VARCHAR(50) NOT NULL,
        ot_hours NUMERIC DEFAULT 0,
        worked_hours NUMERIC DEFAULT 0,
        PRIMARY KEY (user_id, date)
      )
    `);

    return {
      get: async (sql, params = []) => {
        const pgSql = convertSql(sql);
        const res = await pool.query(pgSql, params);
        return res.rows[0];
      },
      all: async (sql, params = []) => {
        const pgSql = convertSql(sql);
        const res = await pool.query(pgSql, params);
        return res.rows;
      },
      run: async (sql, params = []) => {
        const pgSql = convertSql(sql);
        const res = await pool.query(pgSql, params);
        let lastID = null;
        if (sql.trim().toUpperCase().startsWith('INSERT INTO USERS')) {
          const mobile = params[1];
          const userRes = await pool.query('SELECT id FROM users WHERE mobile = $1', [mobile]);
          if (userRes.rows[0]) {
            lastID = userRes.rows[0].id;
          }
        }
        return {
          lastID,
          changes: res.rowCount
        };
      }
    };
  } else {
    console.log('Using local SQLite Database...');
    const db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });

    // Create Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        daily_salary REAL NOT NULL,
        ot_rate REAL NOT NULL
      )
    `);

    // Create Attendance table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS attendance (
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        ot_hours REAL DEFAULT 0,
        worked_hours REAL DEFAULT 0,
        PRIMARY KEY (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    return db;
  }
}

module.exports = { initDb };
