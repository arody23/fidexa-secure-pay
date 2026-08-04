import { corsHeaders, kpayFetch } from '../_shared/kpay.ts';

function getProviderCode(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const value = row.provider ?? row.providerCode ?? row.code ?? row.id;
  return typeof value === 'string' ? value : null;
}

function isAvailable(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const row = item as Record<string, unknown>;
  if (typeof row.available === 'boolean') return row.available;
  if (typeof row.isAvailable === 'boolean') return row.isAvailable;
  return String(row.status || '').toUpperCase() === 'AVAILABLE';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const res = await kpayFetch('/api/v1/payments/availability');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Disponibilité KPay indisponible');
    }

    const entries = Array.isArray(data)
      ? data
      : Array.isArray(data.providers)
      ? data.providers
      : [];
    const availableProviderCodes = entries
      .filter(isAvailable)
      .map(getProviderCode)
      .filter((code): code is string => Boolean(code));

    return new Response(
      JSON.stringify({
        availableProviderCodes,
        fetchedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[kpay-availability]', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur KPay' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
