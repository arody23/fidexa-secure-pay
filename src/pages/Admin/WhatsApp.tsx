import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  LogOut,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { adminNotify } from '@/lib/adminNotify';

type WhatsAppStatus = {
  engine?: string;
  officialApi?: boolean;
  enabled?: boolean;
  ready?: boolean;
  state?: string;
  hasQr?: boolean;
  qrUpdatedAt?: string | null;
  qrDataUrl?: string | null;
  info?: { wid?: string | null; pushname?: string | null; platform?: string | null } | null;
  lastError?: string | null;
  recentEvents?: { at: string; level: string; message: string }[];
  settings?: Record<string, string | null | boolean | undefined>;
};

type LogRow = {
  id: string;
  event_type: string;
  channel: string;
  recipient: string;
  status: string;
  error?: string | null;
  body?: string | null;
  created_at: string;
};

/**
 * Admin — connexion WhatsApp via whatsapp-web.js (QR), logs et paramètres.
 */
export default function AdminWhatsApp() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [wa, setWa] = useState<WhatsAppStatus | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      // Statut/QR d'abord (rapide), puis overview (logs)
      const waStatus = await adminNotify.whatsapp();
      setWa(waStatus || null);
      try {
        const data = await adminNotify.overview();
        if (data.whatsapp) setWa(data.whatsapp);
        setLogs(data.logs || []);
      } catch {
        /* logs optionnels */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Service injoignable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => {
      // Poll QR / statut toutes les 3s tant que pas ready
      refresh();
    }, 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const reconnect = async () => {
    try {
      setBusy(true);
      const data = await adminNotify.reconnect();
      setWa(data);
      toast({ title: 'Reconnexion', description: 'Un nouveau QR va apparaître.' });
      await refresh();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Reconnexion impossible',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      setBusy(true);
      await adminNotify.logout();
      toast({ title: 'Déconnecté', description: 'Session WhatsApp Web fermée.' });
      await refresh();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Déconnexion impossible',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const stateBadge = () => {
    if (wa?.ready) return <Badge className="bg-emerald-600">Connecté</Badge>;
    if (wa?.state === 'qr') return <Badge variant="secondary">En attente de scan QR</Badge>;
    if (wa?.state === 'initializing' || wa?.state === 'authenticated')
      return <Badge variant="outline">Connexion…</Badge>;
    if (wa?.state === 'disabled') return <Badge variant="destructive">Désactivé</Badge>;
    return <Badge variant="outline">{wa?.state || '—'}</Badge>;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">WhatsApp</h1>
          <p className="mt-1 text-muted-foreground">
            Connexion via <strong>whatsapp-web.js</strong> (scan QR) — pas l&apos;API officielle Meta.
            En prod : service Railway H24.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading || busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="secondary" onClick={reconnect} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
            Nouveau QR
          </Button>
          <Button variant="destructive" onClick={logout} disabled={busy || !wa?.ready}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnecter
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <br />
            <span className="text-xs opacity-90">
              En local : notification-service sur :3099 + frontend Vite (:8080). En prod : URL
              Railway dans le secret Supabase NOTIFICATION_SERVICE_URL (pas host.docker.internal).
            </span>
          </AlertDescription>
        </Alert>
      )}

      {loading && !wa ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Connexion
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Moteur : {wa?.engine || 'whatsapp-web.js'} {stateBadge()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wa?.ready ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
                  <p className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    WhatsApp Web connecté
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Compte : {wa.info?.pushname || '—'} · +{wa.info?.wid || '—'}
                  </p>
                </div>
              ) : wa?.qrDataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={wa.qrDataUrl}
                    alt="QR WhatsApp Web"
                    className="rounded-lg border bg-white p-2"
                    width={280}
                    height={280}
                  />
                  <p className="text-center text-sm text-muted-foreground">
                    WhatsApp téléphone → <strong>Appareils connectés</strong> → Connecter un appareil
                    <br />
                    {wa.qrUpdatedAt
                      ? `QR mis à jour : ${new Date(wa.qrUpdatedAt).toLocaleTimeString('fr-FR')}`
                      : null}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pas de QR pour l&apos;instant. Cliquez sur <strong>Nouveau QR</strong> ou attendez
                  l&apos;initialisation du service.
                </p>
              )}

              {wa?.lastError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{wa.lastError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres service</CardTitle>
              <CardDescription>Variables utiles (Railway / local)</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {Object.entries(wa?.settings || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-border/60 py-1.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="max-w-[60%] truncate text-right font-mono text-xs">
                      {String(v ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Événements WhatsApp (live)</CardTitle>
              <CardDescription>Logs du client whatsapp-web.js</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-56 space-y-1 overflow-y-auto font-mono text-xs">
                {(wa?.recentEvents || []).length === 0 && (
                  <p className="text-muted-foreground">Aucun événement</p>
                )}
                {(wa?.recentEvents || []).map((e, i) => (
                  <div key={`${e.at}-${i}`} className="flex gap-2 border-b border-border/40 py-1">
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(e.at).toLocaleTimeString('fr-FR')}
                    </span>
                    <span
                      className={
                        e.level === 'error'
                          ? 'text-destructive'
                          : e.level === 'warn'
                          ? 'text-amber-600'
                          : ''
                      }
                    >
                      [{e.level}] {e.message}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Journal des notifications envoyées</CardTitle>
              <CardDescription>Table notification_logs (OTP, paiement, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {logs.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun envoi pour l&apos;instant</p>
                )}
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{l.event_type}</span>
                      <Badge variant={l.status === 'sent' ? 'default' : 'destructive'}>
                        {l.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {l.channel} → {l.recipient} ·{' '}
                      {new Date(l.created_at).toLocaleString('fr-FR')}
                    </p>
                    {l.error && <p className="mt-1 text-xs text-destructive">{l.error}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
