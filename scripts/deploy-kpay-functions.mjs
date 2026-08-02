/**
 * Deploy KPay edge functions via Supabase Management API (no CLI required).
 * Requires SUPABASE_ACCESS_TOKEN in env or .env
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
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

function collectSharedFiles() {
  const sharedDir = path.join(root, 'supabase/functions/_shared');
  const files = [];
  for (const name of readdirSync(sharedDir)) {
    if (!name.endsWith('.ts')) continue;
    files.push({
      name: `_shared/${name}`,
      content: readFileSync(path.join(sharedDir, name), 'utf8'),
    });
  }
  return files;
}

async function deployFunction(token, slug, verifyJwt) {
  const entryPath = path.join(root, 'supabase/functions', slug, 'index.ts');
  if (!existsSync(entryPath)) {
    throw new Error(`Missing ${entryPath}`);
  }

  // Mirror CLI layout: <slug>/index.ts imports ../_shared/*.ts
  const entrypointRel = `${slug}/index.ts`;

  const form = new FormData();
  form.append(
    'metadata',
    new Blob(
      [
        JSON.stringify({
          name: slug,
          entrypoint_path: entrypointRel,
          verify_jwt: verifyJwt,
        }),
      ],
      { type: 'application/json' }
    )
  );

  form.append(
    'file',
    new Blob([readFileSync(entryPath, 'utf8')], { type: 'application/typescript' }),
    entrypointRel
  );

  for (const f of collectSharedFiles()) {
    form.append(
      'file',
      new Blob([f.content], { type: 'application/typescript' }),
      f.name
    );
  }

  const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${slug}: HTTP ${res.status} ${text}`);
  }
  console.log(`OK ${slug}:`, text.slice(0, 200));
}

const env = loadEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN manquant');
  process.exit(1);
}

// webhook + create-payment/verify must accept unauthenticated client/webhook calls
const functions = [
  { slug: 'kpay-create-payment', verifyJwt: false },
  { slug: 'kpay-verify-payment', verifyJwt: false },
  { slug: 'kpay-create-payout', verifyJwt: false }, // auth checked inside (admin JWT)
  { slug: 'kpay-webhook', verifyJwt: false },
];

for (const fn of functions) {
  console.log(`\nDeploy ${fn.slug}...`);
  await deployFunction(token, fn.slug, fn.verifyJwt);
}

console.log('\n✅ KPay edge functions déployées.');
