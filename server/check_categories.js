
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB.");
    const res = await client.query("SELECT DISTINCT category FROM sessions;");
    console.log('Unique categories in DB:', res.rows.map(r => r.category));
    
    const countRes = await client.query("SELECT count(*) FROM sessions WHERE category != 'INDIVIDUELLE';");
    console.log('Count of non-INDIVIDUELLE sessions:', countRes.rows[0].count);
    
    if (parseInt(countRes.rows[0].count) > 0) {
        const sampleRes = await client.query("SELECT category FROM sessions WHERE category != 'INDIVIDUELLE' LIMIT 1;");
        console.log('Sample of non-INDIVIDUELLE session category:', sampleRes.rows[0].category);
    }
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await client.end();
  }
}

check();
