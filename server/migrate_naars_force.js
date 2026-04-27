const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sql = fs.readFileSync(path.join(__dirname, '..', 'NAARS_MIGRATION.sql'), 'utf8');

async function applyMigration() {
  // Try IPv6 address first
  const ipv6Host = '[2600:1f13:838:6e37:9009:6bbf:215b:ef51]';
  console.log(`Connecting to database at ${ipv6Host}...`);
  
  const client = new Client({
    host: ipv6Host,
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected via IPv6! Applying migration...');
    await client.query(sql);
    console.log('Migration successful!');
  } catch (err) {
    console.error('IPv6 failed:', err.message);
    
    console.log('Trying pooler host with port 6543...');
    const poolerClient = new Client({
      host: 'aws-0-ca-central-1.pooler.supabase.com',
      port: 6543,
      user: `${process.env.DB_USER}.myzmsgzoirmzmacglwmn`,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });
    
    try {
      await poolerClient.connect();
      console.log('Connected via Pooler! Applying migration...');
      await poolerClient.query(sql);
      console.log('Migration successful!');
    } catch (err2) {
      console.error('Pooler failed:', err2.message);
      process.exit(1);
    } finally {
      await poolerClient.end();
    }
  } finally {
    try { await client.end(); } catch(e) {}
  }
}

applyMigration();
