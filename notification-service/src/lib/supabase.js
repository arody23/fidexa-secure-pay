import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

let _client = null;

/**
 * Client Supabase lazy — ne fait pas planter le process au boot
 * (healthcheck Railway doit répondre même si les secrets manquent encore).
 */
export function getSupabase() {
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (Variables Railway)'
    );
  }
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/** Compat : même API qu'avant, mais throw clair si secrets absents à l'usage */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabase();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

if (!url || !key) {
  console.warn(
    '[notify] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants — /health OK, API métier désactivée jusqu’à config Railway'
  );
} else {
  console.log('[notify] Supabase configuré');
}
