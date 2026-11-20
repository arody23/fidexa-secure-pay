import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

type Audience = 'opted_in' | 'all_providers' | 'one';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
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

    const body = await req.json();
    const title = String(body.title || '').trim();
    const message = String(body.message || body.body || '').trim();
    const audience = (body.audience || 'opted_in') as Audience;
    const mediaUrl = String(body.mediaUrl || '').trim() || null;
    const mediaType = String(body.mediaType || 'none') as 'none' | 'image' | 'video' | 'document';
    const buttonLabel = String(body.buttonLabel || '').trim() || null;
    const buttonUrl = String(body.buttonUrl || '').trim() || null;
    const targetUserId = String(body.userId || body.targetUserId || '').trim() || null;

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'Titre et message requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = admin
      .from('users')
      .select('id, phone_number, whatsapp_marketing_opt_in, role, is_admin')
      .not('phone_number', 'is', null);

    if (audience === 'one' && targetUserId) {
      query = query.eq('id', targetUserId);
    } else if (audience === 'opted_in') {
      query = query.eq('whatsapp_marketing_opt_in', true);
    }

    const { data: recipients, error: recErr } = await query;
    if (recErr) throw new Error(recErr.message);

    const targets = (recipients || []).filter(
      (r) =>
        r.phone_number &&
        String(r.phone_number).replace(/\D/g, '').length >= 9 &&
        r.is_admin !== true &&
        r.role !== 'admin'
    );

    const ctaBlock =
      buttonLabel && buttonUrl
        ? `\n\n👉 *${buttonLabel}*\n${buttonUrl}`
        : buttonUrl
          ? `\n\n${buttonUrl}`
          : '';

    const { data: campaign, error: campErr } = await admin
      .from('whatsapp_campaigns')
      .insert({
        title,
        body: message,
        media_url: mediaUrl,
        media_type: mediaUrl ? mediaType : 'none',
        button_label: buttonLabel,
        button_url: buttonUrl,
        audience,
        target_user_id: targetUserId,
        status: 'queued',
        queued_count: targets.length,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (campErr) throw new Error(campErr.message);

    let queued = 0;
    for (const row of targets) {
      const phone = String(row.phone_number).replace(/\D/g, '');
      const result = await dispatchNotificationEvent('marketing.campaign', {
        recipientPhone: phone,
        idempotencyKey: `marketing.campaign:${campaign.id}:${row.id}`,
        variables: {
          message,
          cta_block: ctaBlock,
          campaign_title: title,
          button_label: buttonLabel || '',
          button_url: buttonUrl || '',
        },
        metadata: {
          campaign_id: campaign.id,
          media_url: mediaUrl,
          media_type: mediaUrl ? mediaType : 'none',
          button_label: buttonLabel,
          button_url: buttonUrl,
        },
      });
      if (result.ok) queued += 1;
    }

    await admin
      .from('whatsapp_campaigns')
      .update({
        status: queued > 0 ? 'sent' : 'failed',
        queued_count: queued,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    return new Response(
      JSON.stringify({
        success: true,
        campaignId: campaign.id,
        recipients: targets.length,
        queued,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
