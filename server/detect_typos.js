require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function detectTypos() {
  const { data, error } = await supabase
    .from('clients')
    .select('destination_city');

  if (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }

  const normalized = {};
  data.forEach(c => {
    const raw = c.destination_city || '(null)';
    const clean = raw.trim().toLowerCase();
    if (!normalized[clean]) normalized[clean] = new Set();
    normalized[clean].add(raw);
  });

  console.log('--- DOUBLONS DE CASSE/ESPACES ---');
  Object.keys(normalized).forEach(clean => {
    if (normalized[clean].size > 1) {
      console.log(`- "${clean}": [${Array.from(normalized[clean]).map(s => `"${s}"`).join(', ')}]`);
    }
  });
  console.log('---------------------------------');
  process.exit(0);
}

detectTypos();
