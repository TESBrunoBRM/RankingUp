const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  console.log('Checking profiles...');
  const { data: profiles, error: err1 } = await supabase.from('profiles').select('id').limit(1);
  console.log('profiles ->', err1 ? err1.message : profiles);
  
  console.log('Checking users...');
  const { data: users, error: err2 } = await supabase.from('users').select('id').limit(1);
  console.log('users ->', err2 ? err2.message : users);
}
checkDb();
