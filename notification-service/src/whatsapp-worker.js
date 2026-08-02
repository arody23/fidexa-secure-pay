/**
 * Processus dédié whatsapp-web.js — évite que Chromium bloque l'API Express.
 * Communique avec le parent via IPC (push statut + commandes).
 */
import 'dotenv/config';
import { WhatsAppChannel } from './channels/WhatsAppChannel.js';

const wa = new WhatsAppChannel();

function pushStatus() {
  try {
    process.send?.({ type: 'status', data: wa.adminStatus() });
  } catch {
    /* parent gone */
  }
}

setInterval(pushStatus, 2000);

process.on('message', async (msg) => {
  if (!msg || typeof msg !== 'object') return;
  const { id, type } = msg;
  try {
    if (type === 'status') {
      process.send?.({ id, ok: true, data: wa.adminStatus() });
      return;
    }
    if (type === 'reconnect') {
      const data = await wa.reconnect();
      process.send?.({ id, ok: true, data });
      pushStatus();
      return;
    }
    if (type === 'logout') {
      await wa.logout(true);
      process.send?.({ id, ok: true, data: wa.adminStatus() });
      pushStatus();
      return;
    }
    if (type === 'send') {
      const data = await wa.send(msg.to, msg.body);
      process.send?.({ id, ok: true, data });
      return;
    }
    process.send?.({ id, ok: false, error: `unknown type ${type}` });
  } catch (err) {
    process.send?.({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

wa.init()
  .then(() => pushStatus())
  .catch((err) => {
    console.error('[whatsapp-worker] init failed:', err instanceof Error ? err.message : err);
    pushStatus();
  });

console.log('[whatsapp-worker] started');
