require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyzeCities() {
  const { data, error } = await supabase
    .from('clients')
    .select('destination_city');

  if (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }

  const counts = {};
  data.forEach(c => {
    const v = c.destination_city || '(null)';
    counts[v] = (counts[v] || 0) + 1;
  });

  console.log('--- ANALYSE DES VILLES ---');
  Object.keys(counts).sort().forEach(city => {
    console.log(`- "${city}": ${counts[city]}`);
  });
  console.log('-------------------------');
  process.exit(0);
}

analyzeCities();
