import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('Supabase URL:', supabaseUrl);
console.log('Using Key (first 10 chars):', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'undefined');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching projects to verify connection...');
  const { data, error } = await supabase.from('projects').select('*').limit(5);
  if (error) {
    console.error('Error fetching projects:', error);
  } else {
    console.log('Successfully connected to database! Projects found:', data.length);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
