/**
 * Deploy push stack: migration SQL + edge functions + VAPID secrets
 * Requires SUPABASE_ACCESS_TOKEN in .env
 */
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const projectRef = 'dkmbtwczuheyyxvuypml';

function loadEnv() {
  const envPath = path.join(root, '.env');
  const env = { ...process.env };
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function run(label, cmd, args, env) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { cwd: root, env, shell: true, encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    console.error(`FAILED: ${label} (exit ${r.status})`);
    process.exit(r.status || 1);
  }
  console.log(`OK: ${label}`);
}

const env = loadEnv();
if (!env.SUPABASE_ACCESS_TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN manquant dans .env');
  process.exit(1);
}

env.SUPABASE_ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;

// 1. Migration
run(
  'Migration push_subscriptions',
  'node',
  ['scripts/apply-sql-api.mjs', 'scripts/apply-push-migration.sql'],
  env
);

// 2. Deploy send-web-push
run(
  'Deploy send-web-push',
  'npx',
  ['supabase', 'functions', 'deploy', 'send-web-push', '--project-ref', projectRef],
  env
);

// 3. VAPID secrets
const pub = env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY;
const priv = env.VAPID_PRIVATE_KEY;
const sub = env.VAPID_SUBJECT || 'mailto:contact@fidexapay.com';
if (!pub || !priv) {
  console.error('VAPID keys manquantes dans .env');
  process.exit(1);
}
run(
  'Secrets VAPID',
  'npx',
  [
    'supabase', 'secrets', 'set',
    `VAPID_PUBLIC_KEY=${pub}`,
    `VAPID_PRIVATE_KEY=${priv}`,
    `VAPID_SUBJECT=${sub}`,
    '--project-ref', projectRef,
  ],
  env
);

// 4. Redeploy geniuspay-webhook (uses _shared/notify.ts)
run(
  'Deploy geniuspay-webhook',
  'npx',
  ['supabase', 'functions', 'deploy', 'geniuspay-webhook', '--project-ref', projectRef],
  env
);

console.log('\n✅ Déploiement push stack terminé.');
