/**
 * Remplace {{variable}} dans un template.
 * Les clés inconnues restent telles quelles.
 */
export function renderTemplate(body, variables = {}) {
  return String(body).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    if (value === undefined || value === null) return `{{${key}}}`;
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
    payment_link: 'https://app.fidexapay.com/pay/demo',
    tracking_link: 'https://app.fidexapay.com/order/demo',
    date: now.toLocaleDateString('fr-FR'),
    time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    ...sample,
  };
}
