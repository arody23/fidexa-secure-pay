import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config';

export async function createDispute(params: {
  linkId: string;
  reason: string;
  description?: string;
}): Promise<{ success: boolean; dispute_id?: string; message?: string; error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-dispute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({
      linkId: params.linkId,
      reason: params.reason,
      description: params.description || params.reason,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || 'Impossible de créer le litige');
  }
  return data;
}
