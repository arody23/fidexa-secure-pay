/** Messages utilisateur pour les erreurs OAuth Supabase. */
export function getOAuthErrorMessage(message: string, provider = 'Google'): string {
  const lower = message.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return `${provider} n'est pas activé sur Supabase. Allez dans Authentication → Providers, activez ${provider}, puis configurez Client ID et Client Secret.`;
  }
  return message;
}
