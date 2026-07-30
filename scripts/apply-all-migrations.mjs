import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) return null;
  return line.replace(/^DATABASE_URL=/, '').trim().replace(/^["']|["']$/g, '');
}

const MIGRATIONS = [
  'scripts/prep-migrations.sql',
  'supabase/migrations/20260728_escrow_workflow.sql',
  'CREATE_SUPPORT_ATTACHMENTS_BUCKET.sql',
  'FIX_RLS_USERS_PROFILE.sql',
  'DISABLE_STORAGE_RLS.sql',
];

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL manquant dans .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connecté à Supabase Postgres\n');

  for (const rel of MIGRATIONS) {
    const filePath = path.join(root, rel);
    if (!fs.existsSync(filePath)) {
      console.warn('Ignoré (fichier absent):', rel);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log('→', path.basename(rel));
    await client.query(sql);
    console.log('  OK\n');
  }

  console.log('Toutes les migrations ont été appliquées.');
} catch (err) {
  console.error('\nErreur:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
