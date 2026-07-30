import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) return null;
  return line.replace(/^DATABASE_URL=/, '').trim().replace(/^["']|["']$/g, '');
}

const connectionString = loadDatabaseUrl();

if (!connectionString) {
  console.error('DATABASE_URL manquant');
  process.exit(1);
}

const migrationFile =
  process.argv[2] ||
  path.join(__dirname, '../supabase/migrations/20260728_escrow_workflow.sql');

const sql = fs.readFileSync(migrationFile, 'utf8');

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connecté à Supabase Postgres');
  console.log('Application:', path.basename(migrationFile));
  await client.query(sql);
  console.log('Migration appliquée avec succès');
} catch (err) {
  console.error('Erreur migration:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
