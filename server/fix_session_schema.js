const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixSchema() {
  console.log("Checking and fixing sessions table schema...");
  
  // Try to add zoom_id if it doesn't exist
  const { error: zoomError } = await supabase.rpc('execute_sql', { 
    sql_query: 'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS zoom_id TEXT;' 
  });
  
  if (zoomError) {
    console.error("Error adding zoom_id via RPC:", zoomError.message);
    // If RPC fails (not enabled), try a direct query approach if we had one, 
    // but usually we rely on RPC or just the fact that it might already exist.
    console.log("Attempting direct schema check via SELECT...");
  } else {
    console.log("zoom_id column ensured.");
  }

  // Also ensure advisor_id and other recent fields
  const { error: advisorError } = await supabase.rpc('execute_sql', { 
    sql_query: 'ALTER TABLE sessions ADD COLUMN IF NOT EXISTS advisor_id UUID REFERENCES auth.users(id);' 
  });
  if (advisorError) console.error("Error adding advisor_id:", advisorError.message);
  else console.log("advisor_id column ensured.");

  // Let's check the current columns
  const { data: sample, error: sampleError } = await supabase.from('sessions').select('*').limit(1);
  if (sampleError) {
    console.error("Could not fetch sessions sample:", sampleError.message);
  } else {
    console.log("Current session columns:", Object.keys(sample[0] || {}));
  }
}

fixSchema();
