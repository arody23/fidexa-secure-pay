import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Ouverture de litige côté client (anon) — service role pour contourner RLS.
 * Body: { linkId, reason, description? }
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
        'id, link_id, client_name, client_email, client_phone, order_status, status, is_paid, refunded'
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

    const { data: dispute, error: insErr } = await supabase
      .from('disputes')
      .insert({
        payment_link_id: link.id,
        client_name: link.client_name || 'Client',
        client_email: link.client_email,
        client_phone: link.client_phone,
        reason,
        description,
        status: 'open',
      })
      .select('id')
      .single();

    if (insErr) throw insErr;

    // Ne touche que order_status — `status` paiement peut avoir une contrainte différente
    const { error: updErr } = await supabase
      .from('payment_links')
      .update({ order_status: 'disputed' })
      .eq('id', link.id);

    if (updErr) {
      console.error('order_status update failed', updErr.message);
      // Le litige existe déjà — on ne rollback pas, mais on signale
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
    console.error(err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Impossible de créer le litige',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
