import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Proxy admin → notification-service (whatsapp-web.js QR, logs, settings).
 * Auth JWT admin. Le secret service reste côté Edge.
 */
function readSecret(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  return raw.trim().replace(/^["']|["']$/g, '');
}

async function assertAdmin(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Non authentifié');
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Session invalide');

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin =
    profile?.is_admin === true ||
    profile?.role === 'admin' ||
    user.user_metadata?.is_admin === true;

  if (!isAdmin) throw new Error('Accès admin requis');
  return user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await assertAdmin(req, supabase);

    const base = readSecret('NOTIFICATION_SERVICE_URL');
    const secret = readSecret('NOTIFICATION_SERVICE_SECRET');
    if (!base || !secret) {
      return new Response(
        JSON.stringify({
          error:
            'Service notifications non configuré. Définissez NOTIFICATION_SERVICE_URL (Railway) et NOTIFICATION_SERVICE_SECRET.',
          configured: false,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (
      !/^https?:\/\//i.test(base) ||
      base.includes('NOTIFICATION_SERVICE_URL') ||
      base.includes('host.docker.internal')
    ) {
      return new Response(
        JSON.stringify({
          error:
            'NOTIFICATION_SERVICE_URL invalide. Dans Supabase → Edge Functions → Secrets, la VALEUR doit être ton URL Railway complète, ex. https://xxx.up.railway.app (pas le nom de la variable).',
          configured: false,
          got: base.slice(0, 80),
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || 'overview');

    const map: Record<string, { method: string; path: string; body?: unknown }> = {
      overview: { method: 'GET', path: '/v1/admin/overview' },
      whatsapp: { method: 'GET', path: '/v1/admin/whatsapp' },
      reconnect: { method: 'POST', path: '/v1/admin/whatsapp/reconnect' },
      logout: { method: 'POST', path: '/v1/admin/whatsapp/logout' },
      logs: { method: 'GET', path: `/v1/logs?limit=${Number(payload.limit || 50)}` },
      'template-test': {
        method: 'POST',
        path: '/v1/templates/test',
        body: {
          eventType: payload.eventType,
          recipientPhone: payload.recipientPhone,
          variables: payload.variables || {},
        },
      },
      health: { method: 'GET', path: '/health' },
    };

    const route = map[action];
    if (!route) {
      return new Response(JSON.stringify({ error: `action inconnue: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `${base.replace(/\/$/, '')}${route.path}`;
    let upstream: Response;
    try {
      upstream = await fetch(url, {
        method: route.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': secret,
        },
        body: route.method === 'GET' ? undefined : JSON.stringify(route.body ?? {}),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({
          error: `Railway injoignable depuis Edge (${base}). Dans Railway → Settings → Networking, le port du domaine doit être le même que PORT (ex. 8080). Détail: ${detail}`,
          upstream: base,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await upstream.text();
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: `Railway a répondu HTTP ${upstream.status}`,
          upstream: url,
          body: text.slice(0, 500),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status =
      message.includes('admin') || message.includes('authent') ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
