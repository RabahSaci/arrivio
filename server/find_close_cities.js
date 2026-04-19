require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function levenshtein(s1, s2) {
  const m = s1.length, n = s2.length;
  const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      if (s1[i - 1] === s2[j - 1]) d[i][j] = d[i - 1][j - 1];
      else d[i][j] = Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]) + 1;
    }
  }
  return d[m][n];
}

async function findCloseMatches() {
  const { data, error } = await supabase
    .from('clients')
    .select('destination_city');

  if (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }

  const cities = [...new Set(data.map(c => c.destination_city || '(null)'))].sort();
  console.log('--- POTENTIELS DOUBLONS ---');
  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const dist = levenshtein(cities[i].toLowerCase(), cities[j].toLowerCase());
      if (dist > 0 && dist <= 2) {
        console.log(`- "${cities[i]}" vs "${cities[j]}" (dist: ${dist})`);
      }
      // Substrings logic
      if (dist > 2 && (cities[i].toLowerCase().includes(cities[j].toLowerCase()) || cities[j].toLowerCase().includes(cities[i].toLowerCase()))) {
        console.log(`- "${cities[i]}" vs "${cities[j]}" (substring)`);
      }
    }
  }
  console.log('----------------------------');
  process.exit(0);
}

findCloseMatches();
