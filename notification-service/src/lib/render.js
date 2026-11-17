const PROD_APP_URL = (
  process.env.APP_PUBLIC_URL || 'https://fidexa-secure-pay.vercel.app'
).replace(/\/$/, '');

/** Réécrit les URLs localhost → prod (évite liens locaux dans WhatsApp). */
export function sanitizePublicUrl(value) {
  if (value === undefined || value === null) return value;
  const str = String(value);
  try {
    const u = new URL(str);
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    ) {
      return `${PROD_APP_URL}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    // not a URL
  }
  return str;
}

/**
 * Remplace {{variable}} dans un template.
 * Les clés inconnues restent telles quelles.
 */
export function renderTemplate(body, variables = {}) {
  return String(body).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    let value = variables[key];
    if (value === undefined || value === null) return `{{${key}}}`;
    if (key === 'tracking_link' || key === 'payment_link' || /_link$|_url$/i.test(key)) {
      value = sanitizePublicUrl(value);
    }
    return String(value);
  });
}

export function previewVariables(sample = {}) {
  const now = new Date();
  return {
    client_name: 'Jean Client',
    merchant_name: 'Marie Prestataire',
    amount: '25 000',
    currency: 'CDF',
    transaction_id: 'txn_demo',
    otp: '482910',
    otp_minutes: '15',
    order_reference: 'CMD-DEMO',
    payment_link: 'https://fidexa-secure-pay.vercel.app/pay/demo',
    tracking_link: 'https://fidexa-secure-pay.vercel.app/order/demo',
    date: now.toLocaleDateString('fr-FR'),
    time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    ...sample,
  };
}
