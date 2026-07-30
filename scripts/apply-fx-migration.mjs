/**
 * Apply FX + refund_requests migration via Supabase Management SQL API
 * Usage: node scripts/apply-fx-migration.mjs
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
const sql = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260730_fx_wallet_and_refund_requests.sql'),
  'utf8'
);

if (!token || !ref) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or VITE_SUPABASE_PROJECT_ID');
  process.exit(1);
}

const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;
console.log('Applying migration to', ref, 'sql length', sql.length);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log('status', res.status);
console.log(text.slice(0, 2000));
if (!res.ok) process.exit(1);
