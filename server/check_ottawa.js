require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOttawa() {
  const { data, error } = await supabase
    .from('clients')
    .select('destination_city');

  if (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }

  const matches = data.filter(c => c.destination_city && c.destination_city.toLowerCase().includes('ottawa'));
  const stats = {};
  matches.forEach(c => {
    stats[c.destination_city] = (stats[c.destination_city] || 0) + 1;
  });

  console.log('--- FOCUS OTTAWA ---');
  Object.keys(stats).forEach(k => console.log(`- "${k}": ${stats[k]}`));
  console.log('--------------------');
  process.exit(0);
}

checkOttawa();
