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
      const { data: users } = await admin
        .from('users')
        .select('id, is_admin, role');
      targetIds = [
        ...new Set(
          (users || [])
            .filter((u) => u.is_admin !== true && u.role !== 'admin')
            .map((u) => u.id as string)
        ),
      ];

      // Fallback si filtre trop strict
      if (!targetIds.length) {
        targetIds = [...new Set((users || []).map((u) => u.id as string))];
      }
    }

    if (!targetIds.length) {
      return new Response(
        JSON.stringify({
          error: 'Aucun utilisateur cible trouvé',
          users: 0,
          pushSent: 0,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: pushRows } = await admin
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', targetIds);
    const pushUserIds = new Set((pushRows || []).map((s) => s.user_id as string));

    let sentTotal = 0;
    let notifiedUsers = 0;
    let pushUsers = 0;

    for (const uid of targetIds) {
      const { error: insertErr } = await admin.from('notifications').insert({
        user_id: uid,
        type: 'system',
        title: title.trim(),
        message: (body || title).trim(),
        link: url || '/dashboard/notifications',
        read: false,
      });

      if (insertErr) {
        console.error('notification insert failed', uid, insertErr.message);
        continue;
      }
      notifiedUsers += 1;

      if (!pushUserIds.has(uid)) continue;

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
        if (Number(result.sent || 0) > 0) pushUsers += 1;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        users: notifiedUsers,
        pushSent: sentTotal,
        pushUsers,
        pushSubscribers: pushUserIds.size,
        warning:
          pushUserIds.size === 0
            ? 'Aucun abonnement push enregistré. Les notifications in-app ont bien été créées — les utilisateurs doivent autoriser les notifications dans l’app.'
            : undefined,
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
