import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { dispatchNotificationEvent } from '../_shared/notifyDispatch.ts';
import { resolveAppPublicUrl } from '../_shared/appUrl.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { paymentLinkId } = await req.json();
    if (!paymentLinkId) throw new Error('paymentLinkId requis');

    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: rpcRaw, error } = await service.rpc('create_feedback_invites', {
      payment_link_id_param: paymentLinkId,
    });
    if (error) throw error;
    const result = typeof rpcRaw === 'string' ? JSON.parse(rpcRaw) : rpcRaw;
    if (!result?.success) throw new Error(result?.error || 'Invitation impossible');

    const base = resolveAppPublicUrl().replace(/\/$/, '');
    const clientUrl = `${base}/avis/client?t=${result.client_token}`;
    const providerUrl = `${base}/avis/prestataire?t=${result.provider_token}`;

    const { data: link } = await service
      .from('payment_links')
      .select('link_id, client_name, client_phone, provider_id, provider_name')
      .eq('id', paymentLinkId)
      .maybeSingle();

    const jobs = [];
    if (link?.client_phone) {
      jobs.push(
        dispatchNotificationEvent('feedback.invite', {
          recipientPhone: link.client_phone,
          paymentLinkId,
          idempotencyKey: `feedback-invite:client:${paymentLinkId}`,
          variables: {
            order_reference: link.link_id,
            client_name: link.client_name || 'Client',
            merchant_name: link.provider_name || 'Prestataire',
            feedback_url: clientUrl,
          },
        })
      );
    }

    if (link?.provider_id) {
      const { data: provider } = await service
        .from('users')
        .select('phone_number, full_name')
        .eq('id', link.provider_id)
        .maybeSingle();
      if (provider?.phone_number) {
        jobs.push(
          dispatchNotificationEvent('feedback.invite', {
            recipientPhone: provider.phone_number,
            paymentLinkId,
            idempotencyKey: `feedback-invite:provider:${paymentLinkId}`,
            variables: {
              order_reference: link.link_id,
              client_name: link.client_name || 'Client',
              merchant_name: provider.full_name || link.provider_name || 'Prestataire',
              feedback_url: providerUrl,
            },
          })
        );
      }
    }

    await Promise.all(jobs);
    return new Response(JSON.stringify({ success: true, clientUrl, providerUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Erreur' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
