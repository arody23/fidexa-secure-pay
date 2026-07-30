import type { SupabaseClient } from '@supabase/supabase-js';

/** Envoie une push Web (VAPID) via Edge Function — fire-and-forget */
export async function dispatchWebPush(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: { user_id: string; title: string; body?: string; url?: string }
) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('dispatchWebPush failed:', e);
  }
}

/** Insère notification in-app + push navigateur */
export async function notifyUser(
  supabase: SupabaseClient,
  opts: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }
) {
  const { user_id, title, message, type = 'system', link = '/dashboard/notifications' } = opts;

  await supabase.from('notifications').insert({
    user_id,
    title,
    message,
    type,
    link,
    read: false,
  });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseUrl && serviceKey) {
    await dispatchWebPush(supabaseUrl, serviceKey, {
      user_id,
      title,
      body: message,
      url: link,
    });
  }
}
