/**
 * Apply SQL via Supabase Management API.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-sql-api.mjs path/to/file.sql
 */
import { readFileSync } from 'fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'dkmbtwczuheyyxvuypml';
const sqlFile = process.argv[2];

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN required');
  process.exit(1);
}
if (!sqlFile) {
  console.error('Usage: node scripts/apply-sql-api.mjs <file.sql>');
  process.exit(1);
}

const query = readFileSync(sqlFile, 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
console.log('HTTP', res.status, text);
if (!res.ok) process.exit(1);
