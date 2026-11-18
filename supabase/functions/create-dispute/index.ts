import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return o.message;
    if (typeof o.error === 'string' && o.error) return o.error;
    if (typeof o.details === 'string' && o.details) return o.details;
  }
  return 'Impossible de créer le litige';
}

/**
 * Ouverture de litige côté client (anon) — service role pour contourner RLS.
 * Body: { linkId, reason, description? }
 * Schéma disputes prod: payment_link_id, reason, description, status, raised_by (nullable)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const linkId = String(body.linkId || body.link_id || '').trim();
    const reason = String(body.reason || '').trim();
    const description = String(body.description || reason || '').trim();
    const evidenceRaw = body.evidenceUrls ?? body.evidence_urls;
    const evidenceUrls = Array.isArray(evidenceRaw)
      ? evidenceRaw.map((u: unknown) => String(u || '').trim()).filter(Boolean)
      : [];

    if (!linkId) {
      return new Response(JSON.stringify({ success: false, error: 'linkId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (reason.length < 3) {
      return new Response(JSON.stringify({ success: false, error: 'Indiquez la raison du litige' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: link, error: linkErr } = await supabase
      .from('payment_links')
      .select(
        'id, link_id, client_name, client_email, client_phone, order_status, status, is_paid, refunded, provider_id, provider_name, amount, currency'
      )
      .eq('link_id', linkId)
      .maybeSingle();

    if (linkErr) throw linkErr;
    if (!link) {
      return new Response(JSON.stringify({ success: false, error: 'Commande introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!link.is_paid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Le paiement n’est pas encore confirmé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (link.refunded) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cette commande a déjà été remboursée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existing } = await supabase
      .from('disputes')
      .select('id')
      .eq('payment_link_id', link.id)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          dispute_id: existing.id,
          message: 'Un litige est déjà ouvert pour cette commande',
          alreadyOpen: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const blocked = ['validated', 'cancelled', 'disputed'];
    if (blocked.includes(String(link.order_status || ''))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Impossible d’ouvrir un litige (statut: ${link.order_status})`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: dispute, error: insErr } = await supabase
      .from('disputes')
      .insert({
        payment_link_id: link.id,
        reason,
        description,
        status: 'open',
        evidence_urls: evidenceUrls.length ? evidenceUrls : [],
      })
      .select('id')
      .single();

    if (insErr) throw insErr;

    const { error: updErr } = await supabase
      .from('payment_links')
      .update({ order_status: 'disputed' })
      .eq('id', link.id);

    if (updErr) {
      console.error('order_status update failed', updErr.message);
    }

    const { error: tlErr } = await supabase.from('order_timeline').insert({
      payment_link_id: link.id,
      status: 'disputed',
      action: 'Litige ouvert',
      description: reason,
      actor_type: 'client',
    });
    if (tlErr) console.error('order_timeline insert failed', tlErr.message);

    const provider = link.provider_id
      ? await supabase.from('users').select('full_name, phone_number').eq('id', link.provider_id).maybeSingle()
      : { data: null };
    const notifyVars = {
      order_reference: link.link_id,
      client_name: link.client_name || 'Client',
      merchant_name: link.provider_name || provider.data?.full_name || 'Prestataire',
      reason,
      amount: String(link.amount ?? ''),
      currency: String(link.currency || ''),
    };
    if (link.client_phone) {
      await dispatchNotificationEvent('dispute.opened', {
        recipientPhone: link.client_phone,
        paymentLinkId: link.id,
        idempotencyKey: `dispute-opened:${dispute.id}:client`,
        variables: notifyVars,
      });
    }
    if (provider.data?.phone_number) {
      await dispatchNotificationEvent('dispute.opened', {
        recipientPhone: provider.data.phone_number,
        paymentLinkId: link.id,
        idempotencyKey: `dispute-opened:${dispute.id}:provider`,
        variables: notifyVars,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dispute_id: dispute.id,
        message: 'Litige ouvert. FidexaPay va examiner le dossier.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-dispute error', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
