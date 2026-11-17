import { useMemo, useState, useEffect } from 'react';
import { PlayCircle, CheckCircle, Package, Clock, AlertTriangle, Send, Scale, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';import { useToast } from '@/hooks/use-toast';
import { useProvider } from '@/contexts/ProviderContext';
import { useProviderPaymentLinks } from '@/hooks/useProviderPaymentLinks';
import { formatAmount } from '@/lib/currency';
import { copyToClipboard } from '@/lib/clipboard';

interface Order {
  id: string;
  link_id: string;
  client_name: string | null;
  description: string;
  amount: number;
  order_status?: string;
  created_at: string;
  started_at?: string | null;
}

export default function ProviderOrders() {
  const { currency } = useProvider();
  const { toast } = useToast();
  const { data: rawLinks, loading, refetch } = useProviderPaymentLinks();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeResponses, setDisputeResponses] = useState<Record<string, string>>({});
  const [existingResponses, setExistingResponses] = useState<Record<string, string>>({});
  const [refundRequestIds, setRefundRequestIds] = useState<Record<string, string>>({});
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const copyPaymentLink = async (linkId: string) => {
    const url = `${window.location.origin}/pay/${linkId}`;
    const ok = await copyToClipboard(url);
    setCopiedLinkId(ok ? linkId : null);
    setTimeout(() => setCopiedLinkId(null), 2000);
    toast({
      title: ok ? 'Lien copié' : 'Copie manuelle',
      description: ok ? 'Envoyez ce lien au client si besoin.' : url,
      variant: ok ? 'default' : 'destructive',
    });
  };

  const orders = useMemo(
    () =>
      (rawLinks as Record<string, unknown>[])
        .filter((link) => Boolean(link.is_paid))
        .filter((link) => {
          const status = link.order_status as string | undefined;
          return (
            !status ||
            ['paid', 'started', 'completed', 'disputed'].includes(status)
          );
        })
        .map((link) => ({
          id: link.id as string,
          link_id: link.link_id as string,
          client_name: (link.client_name as string | null) ?? null,
          description: link.description as string,
          amount: link.amount as number,
          order_status: (link.order_status as string) || 'paid',
          created_at: link.created_at as string,
          started_at: link.started_at as string | null | undefined,
        })) as Order[],
    [rawLinks]
  );

  useEffect(() => {
    const disputedIds = orders.filter((o) => o.order_status === 'disputed').map((o) => o.id);
    if (disputedIds.length === 0) return;

    void (async () => {
      const map: Record<string, string> = {};
      const refundMap: Record<string, string> = {};

      const { data: refunds } = await supabase
        .from('refund_requests' as never)
        .select('id, payment_link_id, provider_statement, status')
        .in('payment_link_id', disputedIds)
        .in('status', ['pending', 'awaiting_provider', 'awaiting_client', 'under_review']);

      (refunds as { id: string; payment_link_id: string; provider_statement: string | null }[] | null)?.forEach(
        (r) => {
          refundMap[r.payment_link_id] = r.id;
          if (r.provider_statement) map[r.payment_link_id] = r.provider_statement;
        }
      );

      const { data } = await supabase
        .from('disputes')
        .select('payment_link_id, provider_response')
        .in('payment_link_id', disputedIds)
        .eq('status', 'open');

      (data || []).forEach((d) => {
        if (d.payment_link_id && d.provider_response && !map[d.payment_link_id]) {
          map[d.payment_link_id] = d.provider_response;
        }
      });

      setRefundRequestIds(refundMap);
      setExistingResponses(map);
    })();
  }, [orders]);

  const handleStartOrder = async (linkId: string) => {
    try {
      setActionLoading(linkId);
      const { data, error } = await supabase.rpc('start_order', {
        link_id_param: linkId,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.success) {
        toast({ title: 'Commande démarrée', description: result.message });
        refetch();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de démarrer',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteOrder = async (linkId: string) => {
    try {
      setActionLoading(linkId);
      const { data, error } = await supabase.rpc('complete_order', {
        link_id_param: linkId,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.success) {
        toast({ title: 'Commande finalisée', description: result.message });
        refetch();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de finaliser',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitDisputeResponse = async (linkId: string, orderId: string) => {
    const response = disputeResponses[orderId]?.trim();
    if (!response || response.length < 10) {
      toast({
        title: 'Réponse requise',
        description: 'Décrivez votre version des faits (min. 10 caractères)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActionLoading(linkId);
      const refundId = refundRequestIds[orderId];

      if (refundId) {
        const { data, error } = await supabase.rpc('respond_refund_request' as never, {
          request_id_param: refundId,
          statement_param: response,
        } as never);
        if (error) throw error;
        const result = typeof data === 'string' ? JSON.parse(data) : data;
        if (!result?.success) throw new Error(result?.error || 'Erreur');
      } else {
        const { data, error } = await supabase.rpc('submit_provider_dispute_response', {
          link_id_param: linkId,
          response_param: response,
          evidence_urls_param: [],
        });
        if (error) throw error;
        const result = typeof data === 'string' ? JSON.parse(data) : data;
        if (!result?.success) throw new Error(result?.error || 'Erreur');
      }

      toast({
        title: 'Réponse envoyée',
        description: 'Votre version a été transmise à FidexaPay pour arbitrage',
      });
      setExistingResponses((prev) => ({ ...prev, [orderId]: response }));
      refetch();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Impossible d'envoyer la réponse",
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { color: string; label: string }> = {
      paid: { color: 'bg-blue-100 text-blue-800', label: 'Nouvelle commande' },
      started: { color: 'bg-yellow-100 text-yellow-800', label: 'En cours' },
      completed: { color: 'bg-amber-100 text-amber-900', label: 'En attente de validation' },
      disputed: { color: 'bg-red-100 text-red-800', label: 'Litige' },
      validated: { color: 'bg-green-100 text-green-800', label: 'Validée' },
    };
    const style = styles[status] || styles.paid;
    return <Badge className={style.color}>{style.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b3b78] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] md:text-3xl">
          Commandes à traiter
        </h1>
        <p className="mt-1 text-sm text-[#5c7188]">{orders.length} active(s)</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center ring-1 ring-[#dbe6f2]">
          <Package className="mx-auto mb-4 h-16 w-16 text-[#5c7188]/30" />
          <p className="text-[#5c7188]">Aucune commande active</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <section key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#0b2f63]">
                  {order.client_name || 'Client'}
                </h2>
                {getStatusBadge(order.order_status || 'paid')}
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#5c7188]">Description</p>
                  <p className="font-medium text-[#0b2f63]">{order.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#5c7188]">Montant</span>
                  <span className="text-lg font-semibold">
                    {formatAmount(order.amount, currency)}
                  </span>
                </div>
                {order.started_at && (
                  <div className="text-sm text-[#5c7188]">
                    <Clock className="mr-1 inline h-4 w-4" />
                    Démarré le{' '}
                    {new Date(order.started_at).toLocaleDateString('fr-FR')}
                  </div>
                )}
                <div className="space-y-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => copyPaymentLink(order.link_id)}
                  >
                    {copiedLinkId === order.link_id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copier le lien client
                  </Button>
                  {order.order_status === 'paid' && (
                    <Button
                      onClick={() => handleStartOrder(order.link_id)}
                      disabled={actionLoading === order.link_id}
                      className="w-full"
                    >
                      <PlayCircle className="mr-2 h-5 w-5" />
                      {actionLoading === order.link_id
                        ? 'Chargement...'
                        : 'Commencer le travail'}
                    </Button>
                  )}
                  {order.order_status === 'started' && (
                    <Button
                      onClick={() => handleCompleteOrder(order.link_id)}
                      disabled={actionLoading === order.link_id}
                      className="w-full"
                      variant="default"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      {actionLoading === order.link_id
                        ? 'Chargement...'
                        : 'Finaliser la commande'}
                    </Button>
                  )}
                  {order.order_status === 'completed' && (
                    <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
                      <p className="font-semibold">En attente de validation client</p>
                    </div>
                  )}
                  {order.order_status === 'disputed' && (
                    <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <Scale className="h-5 w-5" />
                        <p className="font-semibold">
                          {refundRequestIds[order.id]
                            ? "Demande d'annulation / remboursement"
                            : 'Litige en cours — votre réponse est requise'}
                        </p>
                      </div>
                      {existingResponses[order.id] ? (
                        <div className="rounded-xl bg-white p-3 text-sm ring-1 ring-[#dbe6f2]">
                          <Label className="text-xs text-[#5c7188]">Votre réponse soumise</Label>
                          <p className="mt-1 whitespace-pre-wrap">{existingResponses[order.id]}</p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <Label htmlFor={`dispute-${order.id}`}>Votre version des faits</Label>
                            <Textarea
                              id={`dispute-${order.id}`}
                              placeholder="Ex: J'ai livré le travail le 15/03, voici les détails..."
                              value={disputeResponses[order.id] || ''}
                              onChange={(e) =>
                                setDisputeResponses((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              rows={4}
                              className="mt-1"
                            />
                          </div>
                          <Button
                            onClick={() => handleSubmitDisputeResponse(order.link_id, order.id)}
                            disabled={actionLoading === order.link_id}
                            className="w-full gap-2"
                          >
                            <Send className="h-4 w-4" />
                            {actionLoading === order.link_id
                              ? 'Envoi...'
                              : 'Soumettre ma réponse à FidexaPay'}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
