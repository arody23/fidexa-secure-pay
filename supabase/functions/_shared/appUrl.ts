/** URL publique de l'app (liens WhatsApp, OTP, paiement). */
export const DEFAULT_APP_PUBLIC_URL = 'https://fidexa-secure-pay.vercel.app';

/**
 * Résout l'URL publique. Refuse localhost / 127.0.0.1 pour éviter
 * d'envoyer des liens locaux dans les messages WhatsApp en prod.
 */
export function resolveAppPublicUrl(raw?: string | null): string {
  const fallback = DEFAULT_APP_PUBLIC_URL;
  const candidate = (raw || Deno.env.get('APP_PUBLIC_URL') || fallback)
    .trim()
    .replace(/\/$/, '');

  if (!candidate) return fallback;

  try {
    const u = new URL(candidate);
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    ) {
      return fallback;
    }
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}
