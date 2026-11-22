import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, XCircle, Loader2, ExternalLink, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config';
import { getPlan, normalizePlanId } from '@/lib/plans';

type CheckoutPayload = {
  id: string;
  plan: string | null;
  planName: string | null;
  cycle: string | null;
  amountUsd: number | null;
  status: string | null;
  paymentRef: string | null;
  checkoutUrl: string | null;
  paidAt: string | null;
  periodEnd: string | null;
};

type UiStatus = 'pending' | 'paid' | 'failed' | 'loading' | 'error';

function mapStatus(raw: string | null | undefined, resultHint?: string | null): UiStatus {
  const s = String(raw || '').toLowerCase();
  if (s === 'paid' || s === 'active') return 'paid';
  if (s === 'failed' || s === 'cancelled' || s === 'canceled') return 'failed';
  if (resultHint === 'cancel') return 'failed';
  if (s === 'pending' || !s) return 'pending';
  return 'pending';
}

export default function SubscribeCheckout() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const [search] = useSearchParams();
  const resultHint = search.get('result');
  const [data, setData] = useState<CheckoutPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gatewayOpened, setGatewayOpened] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!subscriptionId) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/subscribe-checkout-status?id=${encodeURIComponent(subscriptionId)}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Statut indisponible');
      setData(json as CheckoutPayload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!subscriptionId) return;
    const t = window.setInterval(() => {
      void fetchStatus();
    }, 3500);
    return () => window.clearInterval(t);
  }, [subscriptionId, fetchStatus]);

  const uiStatus: UiStatus = loading
    ? 'loading'
    : error
      ? 'error'
      : mapStatus(data?.status, resultHint);

  useEffect(() => {
    if (uiStatus !== 'pending' || !data?.checkoutUrl || gatewayOpened) return;
    if (resultHint === 'success' || resultHint === 'cancel') return;
    setGatewayOpened(true);
    const t = window.setTimeout(() => {
      window.location.assign(data.checkoutUrl!);
    }, 900);
    return () => window.clearTimeout(t);
  }, [uiStatus, data?.checkoutUrl, gatewayOpened, resultHint]);

  const plan = useMemo(() => getPlan(normalizePlanId(data?.plan)), [data?.plan]);
  const amountLabel =
    data?.amountUsd != null ? `$${data.amountUsd}` : plan.priceMonthlyUsd ? `$${plan.priceMonthlyUsd}` : '—';
  const cycleLabel = data?.cycle === 'yearly' ? 'annuel' : 'mensuel';
  const expiresLabel = data?.periodEnd
    ? new Date(data.periodEnd).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const statusCopy = {
    loading: {
      title: 'Chargement…',
      body: 'Récupération de votre paiement.',
      icon: Loader2,
      tone: 'text-slate-500',
      ring: 'bg-slate-100',
    },
    pending: {
      title: 'Paiement en attente',
      body: data?.checkoutUrl
        ? 'Redirection vers la page Mobile Money sécurisée…'
        : 'Validez la demande sur votre téléphone. Cette page se met à jour automatiquement.',
      icon: Clock3,
      tone: 'text-slate-600',
      ring: 'bg-slate-100',
    },
    paid: {
      title: 'Paiement reçu',
      body: `Votre plan ${plan.name} est actif. Une confirmation WhatsApp vous a été envoyée.`,
      icon: CheckCircle2,
      tone: 'text-emerald-700',
      ring: 'bg-emerald-50',
    },
    failed: {
      title: resultHint === 'cancel' ? 'Paiement annulé' : 'Paiement échoué',
      body: 'Aucun débit confirmé. Vous pouvez réessayer depuis votre espace abonnement.',
      icon: XCircle,
      tone: 'text-rose-700',
      ring: 'bg-rose-50',
    },
    error: {
      title: 'Impossible de charger',
      body: error || 'Réessayez dans un instant.',
      icon: XCircle,
      tone: 'text-rose-700',
      ring: 'bg-rose-50',
    },
  }[uiStatus];

  const StatusIcon = statusCopy.icon;

  return (
    <div className="relative min-h-[100dvh] bg-[#f4f5f7] text-slate-800">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(15,23,42,.06), transparent 55%)',
        }}
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center justify-between">
          <Logo />
          <Link
            to="/dashboard/subscriptions"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Abonnement
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_-28px_rgba(15,23,42,.35)] sm:p-8">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${statusCopy.ring}`}>
              <StatusIcon
                className={`h-7 w-7 ${statusCopy.tone} ${uiStatus === 'loading' ? 'animate-spin' : ''}`}
                strokeWidth={1.75}
              />
            </div>

            <h1 className="mt-5 text-center text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {statusCopy.title}
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">{statusCopy.body}</p>

            <div className="mt-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Plan</span>
                <span className="font-medium text-slate-800">{plan.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Montant</span>
                <span className="font-medium tabular-nums text-slate-800">
                  {amountLabel}
                  <span className="ml-1 font-normal text-slate-500">· {cycleLabel}</span>
                </span>
              </div>
              {uiStatus === 'paid' && expiresLabel ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Valide jusqu’au</span>
                  <span className="font-medium text-slate-800">{expiresLabel}</span>
                </div>
              ) : null}
              {data?.paymentRef ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Référence</span>
                  <span className="max-w-[55%] truncate font-mono text-xs text-slate-600">
                    {data.paymentRef}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-6 space-y-2">
              {uiStatus === 'pending' && data?.checkoutUrl ? (
                <Button
                  className="h-12 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => window.location.assign(data.checkoutUrl!)}
                >
                  Continuer le paiement
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              ) : null}

              {uiStatus === 'paid' ? (
                <Button asChild className="h-12 w-full rounded-xl bg-emerald-700 text-white hover:bg-emerald-800">
                  <Link to="/dashboard">Aller au tableau de bord</Link>
                </Button>
              ) : null}

              {uiStatus === 'failed' || uiStatus === 'error' ? (
                <Button asChild className="h-12 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                  <Link to="/dashboard/subscriptions">Réessayer</Link>
                </Button>
              ) : null}

              {uiStatus === 'pending' ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-11 w-full rounded-xl border-slate-200 text-slate-600"
                >
                  <Link to="/dashboard/subscriptions">Fermer</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
            Ne fermez pas cette page pendant la validation Mobile Money.
          </p>
        </main>
      </div>
    </div>
  );
}
