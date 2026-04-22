
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
  console.log("Adding programming_type column to sessions table...");
  
  // Note: Since we don't have direct SQL access through the basic JS client easily for ALTER TABLE 
  // unless we use a RPC or the user runs it in the dashboard, 
  // I will try to use the 'pg' library if available or suggest the SQL.
  // Wait, I saw 'pg' was installed in previous turns.
  
  const { Error } = await supabase.from('sessions').select('programming_type').limit(1);
  if (Error) {
     console.log("Column seems missing, please run this SQL in Supabase dashboard:");
     console.log("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS programming_type TEXT DEFAULT 'Service standard';");
  } else {
     console.log("Column already exists.");
  }
}

// Better approach: Use 'pg' to run the SQL directly as I did before.
const { Client } = require('pg');

async function runSql() {
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
    console.log("Connected to DB. Running migration...");
    await client.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS programming_type TEXT DEFAULT 'Service standard';");
    console.log("Migration successful: Added programming_type column.");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

runSql();
