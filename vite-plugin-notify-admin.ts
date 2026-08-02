import type { Plugin } from 'vite';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

/**
 * En dev, le dashboard appelle /__notify-admin au lieu de l'Edge Function cloud.
 * L'Edge Supabase ne peut pas joindre host.docker.internal / localhost.
 */
function loadServiceSecret(root: string): string {
  const candidates = [
    path.join(root, 'notification-service', '.env'),
    path.join(root, '.env'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(?:SERVICE_SECRET|NOTIFICATION_SERVICE_SECRET)=(.*)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return process.env.NOTIFICATION_SERVICE_SECRET || process.env.SERVICE_SECRET || '';
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function notifyAdminLocalPlugin(): Plugin {
  return {
    name: 'fidexa-notify-admin-local',
    configureServer(server) {
      const root = server.config.root;
      const notifyBase = (
        process.env.VITE_NOTIFY_SERVICE_URL ||
        'http://127.0.0.1:3099'
      ).replace(/\/$/, '');

      server.middlewares.use('/__notify-admin', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'POST only' }));
          return;
        }

        try {
          const secret = loadServiceSecret(root);
          if (!secret) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error:
                  'SERVICE_SECRET manquant (notification-service/.env). Relancez npm run dev après l’avoir défini.',
              })
            );
            return;
          }

          const raw = await readBody(req);
          const payload = raw ? JSON.parse(raw) : {};
          const action = String(payload.action || 'overview');
          const map: Record<string, { method: string; path: string; body?: unknown }> = {
            overview: { method: 'GET', path: '/v1/admin/overview' },
            whatsapp: { method: 'GET', path: '/v1/admin/whatsapp' },
            reconnect: { method: 'POST', path: '/v1/admin/whatsapp/reconnect' },
            logout: { method: 'POST', path: '/v1/admin/whatsapp/logout' },
            logs: { method: 'GET', path: `/v1/logs?limit=${Number(payload.limit || 50)}` },
            'template-test': {
              method: 'POST',
              path: '/v1/templates/test',
              body: {
                eventType: payload.eventType,
                recipientPhone: payload.recipientPhone,
                variables: payload.variables || {},
              },
            },
            health: { method: 'GET', path: '/health' },
          };

          const route = map[action];
          if (!route) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `action inconnue: ${action}` }));
            return;
          }

          const upstream = await fetch(`${notifyBase}${route.path}`, {
            method: route.method,
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Secret': secret,
            },
            body: route.method === 'GET' ? undefined : JSON.stringify(route.body ?? {}),
          });

          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(text);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'proxy failed';
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: `Notification-service injoignable sur ${notifyBase}. Lancez-le (npm start dans notification-service). Détail: ${message}`,
            })
          );
        }
      });
    },
  };
}
