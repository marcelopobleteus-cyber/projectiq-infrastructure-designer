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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'profiles',
  'organizations',
  'organization_members',
  'projects',
  'camera_models',
  'camera_locations',
  'network_devices',
  'switch_ports',
  'bom_items',
  'field_tasks',
  'fiber_enclosures',
  'fiber_cables',
  'fiber_splices',
  'user_theme_preferences'
];

async function audit() {
  console.log('--- DATABASE AUDIT ---');
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        // Table might not exist or be named differently, skip or print reason
        console.log(`Table ${table}: Not found or error (${error.message})`);
      } else {
        console.log(`Table ${table}: ${count} rows`);
      }
    } catch (e) {
      console.log(`Table ${table}: Failed (${e.message})`);
    }
  }
}

audit();
