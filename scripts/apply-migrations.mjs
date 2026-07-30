/**
 * Apply selected Supabase migrations via Management API
 * Usage: node scripts/apply-migrations.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = loadEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = (env.VITE_SUPABASE_PROJECT_ID || '').replace(/"/g, '');

if (!token || !ref) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or VITE_SUPABASE_PROJECT_ID');
  process.exit(1);
}

const migrationsDir = path.join(root, 'supabase/migrations');
const targetFiles = [
  '20260730_exchange_rates_admin.sql',
  '20260730_fx_wallet_and_refund_requests.sql',
  '20260730_provider_testimonials.sql',
];

const baseUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`;

for (const file of targetFiles) {
  const filePath = path.join(migrationsDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipping ${file} (not found)`);
    continue;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Applying ${file} ...`);
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  console.log(`  status ${res.status}: ${text.slice(0, 200)}`);
  if (!res.ok) {
    console.error(`Migration ${file} failed.`);
    process.exit(1);
  }
}

console.log('Target migrations applied.');
