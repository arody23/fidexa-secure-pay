/**
 * Deploy edge functions related to notifications / OTP / kpay (shared notifyDispatch).
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
  return readdirSync(sharedDir)
    .filter((n) => n.endsWith('.ts'))
    .map((name) => ({
      name: `_shared/${name}`,
      content: readFileSync(path.join(sharedDir, name), 'utf8'),
    }));
}

async function deployFunction(token, slug, verifyJwt) {
  const entryPath = path.join(root, 'supabase/functions', slug, 'index.ts');
  const entrypointRel = `${slug}/index.ts`;
  const form = new FormData();
  form.append(
    'metadata',
    new Blob(
      [JSON.stringify({ name: slug, entrypoint_path: entrypointRel, verify_jwt: verifyJwt })],
      { type: 'application/json' }
    )
  );
  form.append(
    'file',
    new Blob([readFileSync(entryPath, 'utf8')], { type: 'application/typescript' }),
    entrypointRel
  );
  for (const f of collectSharedFiles()) {
    form.append('file', new Blob([f.content], { type: 'application/typescript' }), f.name);
  }
  const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status} ${text}`);
  console.log(`OK ${slug}`);
}

const env = loadEnv();
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN manquant');
  process.exit(1);
}

const functions = [
  { slug: 'admin-notify-proxy', verifyJwt: true },
  { slug: 'order-client-access', verifyJwt: false },
  { slug: 'kpay-create-payment', verifyJwt: false },
  { slug: 'kpay-verify-payment', verifyJwt: false },
  { slug: 'kpay-webhook', verifyJwt: false },
  { slug: 'kpay-create-payout', verifyJwt: false },
];

for (const fn of functions) {
  console.log(`Deploy ${fn.slug}...`);
  await deployFunction(token, fn.slug, fn.verifyJwt);
}
console.log('Done.');
