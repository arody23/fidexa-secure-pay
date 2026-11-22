import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

type Audience = 'opted_in' | 'all_providers' | 'one';
type Automation = 'none' | 'daily' | 'weekly' | 'monthly';

function nextRunIso(automation: Automation, from = new Date()): string | null {
  if (!automation || automation === 'none') return null;
  const d = new Date(from);
  if (automation === 'daily') d.setDate(d.getDate() + 1);
  else if (automation === 'weekly') d.setDate(d.getDate() + 7);
  else if (automation === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

async function queueCampaign(
  admin: ReturnType<typeof createClient>,
  opts: {
    campaignId: string;
    title: string;
    headline: string;
    message: string;
    mediaUrl: string | null;
    mediaType: string;
    buttonLabel: string | null;
    buttonUrl: string | null;
    targets: { id: string; phone_number: string }[];
  }
) {
  const composed = opts.headline
    ? `*${opts.headline}*\n\n${opts.message}`
    : `*${opts.title}*\n\n${opts.message}`;
  const ctaBlock =
    opts.buttonLabel && opts.buttonUrl
      ? `\n\n👉 *${opts.buttonLabel}*\n${opts.buttonUrl}`
      : opts.buttonUrl
        ? `\n\n${opts.buttonUrl}`
        : '';

  let queued = 0;
  for (const row of opts.targets) {
    const phone = String(row.phone_number).replace(/\D/g, '');
    const result = await dispatchNotificationEvent('marketing.campaign', {
      recipientPhone: phone,
      idempotencyKey: `marketing.campaign:${opts.campaignId}:${row.id}:${Date.now()}`,
      variables: {
        message: composed,
        cta_block: ctaBlock,
        campaign_title: opts.title,
        button_label: opts.buttonLabel || '',
        button_url: opts.buttonUrl || '',
      },
      metadata: {
        campaign_id: opts.campaignId,
        media_url: opts.mediaUrl,
        media_type: opts.mediaUrl ? opts.mediaType : 'none',
        button_label: opts.buttonLabel,
        button_url: opts.buttonUrl,
      },
    });
    if (result.ok) queued += 1;
  }
  return queued;
}

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
    const action = String(body.action || 'send');

    // Dispatch des campagnes dues (programmation / automatisation)
    if (action === 'dispatch_due') {
      const nowIso = new Date().toISOString();
      const { data: due } = await admin
        .from('whatsapp_campaigns')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', nowIso)
        .limit(20);

      let processed = 0;
      for (const camp of due || []) {
        let query = admin
          .from('users')
          .select('id, phone_number, whatsapp_marketing_opt_in, role, is_admin')
          .not('phone_number', 'is', null);
        if (camp.audience === 'one' && camp.target_user_id) {
          query = query.eq('id', camp.target_user_id);
        } else if (camp.audience === 'opted_in') {
          query = query.eq('whatsapp_marketing_opt_in', true);
        }
        const { data: recipients } = await query;
        const targets = (recipients || []).filter(
          (r) =>
            r.phone_number &&
            String(r.phone_number).replace(/\D/g, '').length >= 9 &&
            r.is_admin !== true &&
            r.role !== 'admin'
        ) as { id: string; phone_number: string }[];

        const queued = await queueCampaign(admin, {
          campaignId: camp.id,
          title: camp.title,
          headline: camp.headline || '',
          message: camp.body,
          mediaUrl: camp.media_url,
          mediaType: camp.media_type || 'none',
          buttonLabel: camp.button_label,
          buttonUrl: camp.button_url,
          targets,
        });

        const automation = (camp.automation || 'none') as Automation;
        const next = nextRunIso(automation);
        await admin
          .from('whatsapp_campaigns')
          .update({
            status: next ? 'scheduled' : queued > 0 ? 'sent' : 'failed',
            scheduled_at: next,
            queued_count: queued,
            updated_at: new Date().toISOString(),
          })
          .eq('id', camp.id);
        processed += 1;
      }

      return new Response(JSON.stringify({ success: true, processed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const title = String(body.title || '').trim();
    const headline = String(body.headline || body.linkTitle || '').trim();
    const message = String(body.message || body.body || '').trim();
    const audience = (body.audience || 'opted_in') as Audience;
    const mediaUrl = String(body.mediaUrl || '').trim() || null;
    const mediaType = String(body.mediaType || 'none') as 'none' | 'image' | 'video' | 'document';
    const buttonLabel = String(body.buttonLabel || '').trim() || null;
    const buttonUrl = String(body.buttonUrl || '').trim() || null;
    const previewDomain = String(body.previewDomain || '').trim() || null;
    const linkTitle = String(body.linkTitle || headline || title).trim() || null;
    const targetUserId = String(body.userId || body.targetUserId || '').trim() || null;
    const scheduledAtRaw = String(body.scheduledAt || '').trim();
    const automation = (body.automation || 'none') as Automation;

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
    ) as { id: string; phone_number: string }[];

    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    const scheduleInFuture =
      scheduledAt && !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now();

    const { data: campaign, error: campErr } = await admin
      .from('whatsapp_campaigns')
      .insert({
        title,
        headline: headline || null,
        body: message,
        media_url: mediaUrl,
        media_type: mediaUrl ? mediaType : 'none',
        button_label: buttonLabel,
        button_url: buttonUrl,
        preview_domain: previewDomain,
        link_title: linkTitle,
        audience,
        target_user_id: targetUserId,
        status: scheduleInFuture ? 'scheduled' : 'queued',
        scheduled_at: scheduleInFuture
          ? scheduledAt!.toISOString()
          : automation !== 'none'
            ? nextRunIso(automation)
            : null,
        automation: automation === 'none' ? null : automation,
        queued_count: scheduleInFuture ? 0 : targets.length,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (campErr) throw new Error(campErr.message);

    if (scheduleInFuture) {
      return new Response(
        JSON.stringify({
          success: true,
          campaignId: campaign.id,
          scheduled: true,
          scheduledAt: scheduledAt!.toISOString(),
          recipients: targets.length,
          queued: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queued = await queueCampaign(admin, {
      campaignId: campaign.id,
      title,
      headline,
      message,
      mediaUrl,
      mediaType,
      buttonLabel,
      buttonUrl,
      targets,
    });

    const next =
      automation !== 'none' ? nextRunIso(automation) : null;

    await admin
      .from('whatsapp_campaigns')
      .update({
        status: next ? 'scheduled' : queued > 0 ? 'sent' : 'failed',
        scheduled_at: next,
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
        automated: Boolean(next),
        nextRun: next,
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
