require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listCities() {
  const { data, error } = await supabase
    .from('clients')
    .select('destination_city');

  if (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }

  const cities = [...new Set(data.map(c => c.destination_city))].sort();
  console.log('--- VILLES TROUVÉES ---');
  cities.forEach(c => console.log(`"${c}"`));
  console.log('-------------------------');
  process.exit(0);
}

listCities();
