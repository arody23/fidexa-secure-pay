import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';
import { supabase } from '@/integrations/supabase/client';

export async function createDispute(params: {
  linkId: string;
  reason: string;
  description?: string;
}): Promise<{ success: boolean; dispute_id?: string; message?: string; error?: string }> {
  const linkId = String(params.linkId || '').trim();
  const reason = String(params.reason || '').trim();
  const description = String(params.description || reason).trim();

  if (!linkId) throw new Error('Identifiant de commande manquant');
  if (reason.length < 3) throw new Error('Indiquez la raison du litige');

  // Edge Function (service role) — prioritaire pour clients sans compte
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ linkId, reason, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success !== false) return data;
      if (typeof data?.error === 'string' && data.error.length > 0) {
        throw new Error(data.error);
      }
    } catch (err) {
      // Si erreur métier (ex. déjà ouvert / statut), on s’arrête
      if (err instanceof Error && !/Failed to fetch|NetworkError|TypeError/i.test(err.message)) {
        throw err;
      }
    }
  }

  // Fallback RPC
  const { data, error } = await supabase.rpc('create_dispute', {
    link_id_param: linkId,
    reason_param: reason,
    description_param: description,
  });

  if (error) throw new Error(error.message || 'Impossible de créer le litige');
  const result = typeof data === 'string' ? JSON.parse(data) : data;
  if (!result?.success) throw new Error(result?.error || 'Impossible de créer le litige');
  return result;
}
