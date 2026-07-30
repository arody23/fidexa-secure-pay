import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/geniuspay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from('users')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin && profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Accès admin requis' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, body, url, audience = 'all', user_id } = await req.json();
    if (!title?.trim()) {
      return new Response(JSON.stringify({ error: 'Titre requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let targetIds: string[] = [];
    if (audience === 'one' && user_id) {
      targetIds = [user_id];
    } else {
      const { data: subs } = await admin.from('push_subscriptions').select('user_id');
      targetIds = [...new Set((subs || []).map((s) => s.user_id as string))];
    }

    let sentTotal = 0;
    let notifiedUsers = 0;

    for (const uid of targetIds) {
      await admin.from('notifications').insert({
        user_id: uid,
        type: 'system',
        title: title.trim(),
        message: (body || title).trim(),
        link: url || '/dashboard/notifications',
        read: false,
      });

      const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          user_id: uid,
          title: title.trim(),
          body: (body || title).trim(),
          url: url || '/dashboard/notifications',
        }),
      });

      if (pushRes.ok) {
        const result = await pushRes.json();
        sentTotal += Number(result.sent || 0);
        notifiedUsers += 1;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        users: notifiedUsers,
        pushSent: sentTotal,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
