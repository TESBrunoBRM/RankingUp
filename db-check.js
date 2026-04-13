const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mpshqfizadislsqjispd.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ANON_KEY_PURGADA.RViQWqmav1OSLA1xT6iVmjBNspkzTcgFiC1spvsFb-4';
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
