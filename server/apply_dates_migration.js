const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSQL() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    const sqlPath = path.join(__dirname, 'update_client_dates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('SQL Migration for Dates Applied Successfully');
  } catch (err) {
    console.error('Migration Error:', err.message);
  } finally {
    await client.end();
  }
}

runSQL();
