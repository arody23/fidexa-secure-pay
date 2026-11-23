import { useMemo, useState, useEffect } from 'react';
import { PlayCircle, CheckCircle, Package, Clock, Send, Scale, Copy, Check, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProvider } from '@/contexts/ProviderContext';
import { useProviderPaymentLinks } from '@/hooks/useProviderPaymentLinks';
import { formatAmount } from '@/lib/currency';
import { copyToClipboard } from '@/lib/clipboard';
import { uploadSupportAttachment } from '@/lib/orderSupport';
import { getPublicPaymentUrl } from '@/lib/native';

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
  const [disputeEvidence, setDisputeEvidence] = useState<Record<string, string[]>>({});
  const [uploadingEvidence, setUploadingEvidence] = useState<string | null>(null);
  const [refundRequestIds, setRefundRequestIds] = useState<Record<string, string>>({});
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const copyPaymentLink = async (linkId: string) => {
    const url = getPublicPaymentUrl(linkId);
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

  const handleEvidenceUpload = async (orderId: string, fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).slice(0, 5);
    try {
      setUploadingEvidence(orderId);
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'bin';
        const url = await uploadSupportAttachment(orderId, file, ext, file.type);
        urls.push(url);
      }
      setDisputeEvidence((prev) => ({
        ...prev,
        [orderId]: [...(prev[orderId] || []), ...urls].slice(0, 8),
      }));
      toast({ title: 'Preuves ajoutées', description: `${urls.length} fichier(s) prêt(s)` });
    } catch (err) {
      toast({
        title: 'Upload impossible',
        description: err instanceof Error ? err.message : 'Réessayez',
        variant: 'destructive',
      });
    } finally {
      setUploadingEvidence(null);
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
      const evidence = disputeEvidence[orderId] || [];

      if (refundId) {
        const { data, error } = await supabase.rpc('respond_refund_request' as never, {
          request_id_param: refundId,
          statement_param: response,
        } as never);
        if (error) throw error;
        const result = typeof data === 'string' ? JSON.parse(data) : data;
        if (!result?.success) throw new Error(result?.error || 'Erreur');
        if (evidence.length > 0) {
          await supabase.rpc('submit_provider_dispute_response', {
            link_id_param: linkId,
            response_param: response,
            evidence_urls_param: evidence,
          });
        }
      } else {
        const { data, error } = await supabase.rpc('submit_provider_dispute_response', {
          link_id_param: linkId,
          response_param: response,
          evidence_urls_param: evidence,
        });
        if (error) throw error;
        const result = typeof data === 'string' ? JSON.parse(data) : data;
        if (!result?.success) throw new Error(result?.error || 'Erreur');
      }

      toast({
        title: 'Réponse envoyée',
        description:
          evidence.length > 0
            ? 'Votre version et vos preuves ont été transmises à FidexaPay'
            : 'Votre version a été transmise à FidexaPay pour arbitrage',
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
    <div className="mx-auto w-full max-w-xl space-y-4 overflow-x-hidden">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#0b2f63] sm:text-2xl">
          Commandes actives
        </h1>
        <p className="mt-0.5 text-xs text-[#8a9bb0]">{orders.length} en cours</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-[#e2eaf3] bg-white py-10 text-center shadow-[0_1px_2px_rgba(11,59,120,0.04)]">
          <Package className="mx-auto mb-2 h-8 w-8 text-[#c5d0de]" />
          <p className="text-sm text-[#8a9bb0]">Aucune commande active</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="space-y-3 rounded-2xl border border-[#e2eaf3] bg-white p-4 shadow-[0_1px_2px_rgba(11,59,120,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 leading-none">
                  <h2 className="truncate text-sm font-semibold text-[#0b2f63]">
                    {order.client_name || 'Client'}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-[#5c7188]">
                    {order.description}
                  </p>
                </div>
                {getStatusBadge(order.order_status || 'paid')}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#f7fafd] px-3 py-2 text-sm">
                <span className="text-xs text-[#8a9bb0]">Montant</span>
                <span className="font-semibold tabular-nums text-[#0b2f63]">
                  {formatAmount(order.amount, currency)}
                </span>
              </div>

              {order.started_at && (
                <p className="text-xs text-[#8a9bb0]">
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  Démarré le {new Date(order.started_at).toLocaleDateString('fr-FR')}
                </p>
              )}

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full gap-2 text-xs"
                  onClick={() => copyPaymentLink(order.link_id)}
                >
                  {copiedLinkId === order.link_id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copier le lien
                </Button>
                {order.order_status === 'paid' && (
                  <Button
                    onClick={() => handleStartOrder(order.link_id)}
                    disabled={actionLoading === order.link_id}
                    className="w-full bg-[#0b3b78] hover:bg-[#0a3266]"
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
                    className="w-full bg-[#0b3b78] hover:bg-[#0a3266]"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    {actionLoading === order.link_id
                      ? 'Chargement...'
                      : 'Finaliser la commande'}
                  </Button>
                )}
                {order.order_status === 'completed' && (
                  <p className="text-sm font-medium text-amber-900">
                    En attente de validation client
                  </p>
                )}
                {order.order_status === 'disputed' && (
                  <div className="space-y-3 border-t border-[#e4edf6] pt-4">
                    <div className="flex items-center gap-2 text-destructive">
                      <Scale className="h-5 w-5 shrink-0" />
                      <p className="text-sm font-semibold">
                        {refundRequestIds[order.id]
                          ? "Demande d'annulation / remboursement"
                          : 'Litige en cours — votre réponse est requise'}
                      </p>
                    </div>
                    {existingResponses[order.id] ? (
                      <div className="space-y-1">
                        <Label className="text-xs text-[#5c7188]">Votre réponse soumise</Label>
                        <p className="whitespace-pre-wrap text-sm text-[#0b2f63]">
                          {existingResponses[order.id]}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 space-y-1.5">
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
                          />
                        </div>
                        <div className="min-w-0 space-y-1.5">
                          <Label htmlFor={`evidence-${order.id}`}>Preuves (images / PDF)</Label>
                          <Input
                            id={`evidence-${order.id}`}
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            disabled={uploadingEvidence === order.id}
                            onChange={(e) => {
                              void handleEvidenceUpload(order.id, e.target.files);
                              e.target.value = '';
                            }}
                          />
                          {(disputeEvidence[order.id]?.length || 0) > 0 && (
                            <ul className="space-y-1 text-xs text-[#5c7188]">
                              {disputeEvidence[order.id].map((url) => (
                                <li key={url} className="flex items-center gap-1 truncate">
                                  <Paperclip className="h-3 w-3 shrink-0" />
                                  <a href={url} target="_blank" rel="noreferrer" className="underline">
                                    {url.split('/').pop()}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <Button
                          onClick={() => handleSubmitDisputeResponse(order.link_id, order.id)}
                          disabled={actionLoading === order.link_id || uploadingEvidence === order.id}
                          className="w-full gap-2 bg-[#0b3b78] hover:bg-[#0a3266]"
                        >
                          <Send className="h-4 w-4" />
                          {actionLoading === order.link_id
                            ? 'Envoi...'
                            : 'Soumettre réponse + preuves'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}