const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
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
    console.log("Connected to database.");

    // Add zoom_id if not exists
    console.log("Ensuring zoom_id column...");
    await client.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS zoom_id TEXT;');
    
    // Add advisor_id if not exists (from previous conversation summary)
    console.log("Ensuring advisor_id column...");
    await client.query('ALTER TABLE sessions ADD COLUMN IF NOT EXISTS advisor_id UUID REFERENCES auth.users(id);');

    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

runMigration();
