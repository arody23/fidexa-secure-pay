import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Clock, CheckCircle, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import {
  convertToUSD,
  formatAmount,
  formatUSD,
  normalizeCurrency,
  commissionToUSD,
} from '@/lib/currency';

interface EscrowOrder {
  id: string;
  link_id: string;
  client_name: string | null;
  provider_id: string | null;
  amount: number;
  net_amount: number | null;
  commission_amount: number | null;
  order_status: string | null;
  escrow_released: boolean | null;
  auto_release_at: string | null;
  created_at: string;
  is_paid?: boolean;
  currency: string;
}

export default function AdminEscrow() {
  const [orders, setOrders] = useState<EscrowOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('payment_links')
      .select(
        'id, link_id, client_name, provider_id, amount, net_amount, commission_amount, order_status, escrow_released, auto_release_at, created_at, is_paid'
      )
      .eq('is_paid', true)
      .order('created_at', { ascending: false })
      .limit(100);

    const links = data || [];
    const providerIds = [...new Set(links.map((l) => l.provider_id).filter(Boolean))] as string[];

    let currencyMap: Record<string, string> = {};
    if (providerIds.length > 0) {
      const { data: providers } = await supabase
        .from('users')
        .select('id, currency')
        .in('id', providerIds);
      currencyMap = Object.fromEntries(
        (providers || []).map((p) => [p.id, normalizeCurrency(p.currency)])
      );
    }

    setOrders(
      links.map((o) => ({
        ...(o as EscrowOrder),
        currency: (o.provider_id && currencyMap[o.provider_id]) || 'FCFA',
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-escrow')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_links' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const inEscrow = orders.filter((o) => o.is_paid && !o.escrow_released);
  const released = orders.filter((o) => o.escrow_released);
  const pendingAuto = orders.filter(
    (o) => o.order_status === 'completed' && !o.escrow_released && o.auto_release_at
  );
  const disputed = orders.filter((o) => o.order_status === 'disputed' && !o.escrow_released);

  const stats = useMemo(() => {
    const escrowUSD = inEscrow.reduce((s, o) => s + convertToUSD(o.amount, o.currency), 0);
    const commissionsUSD = released.reduce((s, o) => {
      const commission =
        o.commission_amount != null
          ? convertToUSD(o.commission_amount, o.currency)
          : commissionToUSD(o.amount, o.currency);
      return s + commission;
    }, 0);
    const disputedUSD = disputed.reduce((s, o) => s + convertToUSD(o.amount, o.currency), 0);
    return { escrowUSD, commissionsUSD, disputedUSD };
  }, [inEscrow, released, disputed]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Administration</p>
        <h1 className="text-3xl font-bold tracking-tight">Monitoring Escrow</h1>
        <p className="mt-2 text-muted-foreground">
          Totaux en USD — montants originaux par commande selon la devise du prestataire
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4" /> En escrow (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatUSD(stats.escrowUSD)}</p>
            <p className="text-xs text-muted-foreground">{inEscrow.length} commandes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" /> Auto-release
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingAuto.length}</p>
            <p className="text-xs text-muted-foreground">En attente validation client</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Gelés (litige)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatUSD(stats.disputedUSD)}</p>
            <p className="text-xs text-muted-foreground">{disputed.length} commande(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4" /> Libérées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{released.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" /> Commissions (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatUSD(stats.commissionsUSD)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commandes en escrow</CardTitle>
          <CardDescription>Montant client + équivalent USD</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : inEscrow.length === 0 ? (
            <p className="text-muted-foreground">Aucun fonds en escrow actuellement.</p>
          ) : (
            <div className="space-y-2">
              {inEscrow.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/30"
                >
                  <div>
                    <p className="font-medium">{o.client_name || 'Client'}</p>
                    <p className="text-xs text-muted-foreground">{o.link_id}</p>
                  </div>
                  <Badge variant={o.order_status === 'disputed' ? 'destructive' : 'secondary'}>
                    {o.order_status || 'paid'}
                  </Badge>
                  <div className="text-right">
                    <p className="font-semibold">{formatAmount(o.amount, o.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatUSD(convertToUSD(o.amount, o.currency))}
                    </p>
                  </div>
                  {o.auto_release_at && (
                    <p className="text-xs text-muted-foreground">
                      Auto: {new Date(o.auto_release_at).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Règles escrow FidexaPay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Paiement client → fonds bloqués en escrow.</p>
          <p>2. Prestataire démarre → client notifié en temps réel.</p>
          <p>3. Prestataire termine → client valide sous 72h.</p>
          <p>4. Sans validation → libération auto avec commission selon le plan.</p>
          <p>5. Litige → fonds gelés jusqu&apos;à décision admin dans le centre de litiges.</p>
        </CardContent>
      </Card>
    </div>
  );
}
