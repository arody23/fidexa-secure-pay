import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Clock,
  Check,
  AlertTriangle,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderTracker from '@/components/OrderTracker';
import ClientSupportPanel from '@/components/ClientSupportPanel';
import OrderAccessGate from '@/components/OrderAccessGate';
import { formatAmount } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Logo from "@/components/Logo";
import StarRating from "@/components/StarRating";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentLink {
  id: string;
  link_id: string;
  amount: number;
  description: string;
  delivery_days: number;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  is_paid: boolean;
  order_status?: string;
  provider_id: string;
  provider_name?: string;
  provider_avatar?: string | null;
  provider_notes?: string;
  currency?: string | null;
  created_at: string;
  escrow_released?: boolean;
  refunded?: boolean;
  refunded_at?: string;
  auto_release_at?: string | null;
  commission_rate?: number | null;
  net_amount?: number | null;
}

interface Provider {
  full_name: string;
  avatar_url: string | null;
  rating?: number;
}

interface SupportMessage {
  id: string;
  sender_type: string;
  content: string;
  message?: string;
  message_type: string;
  attachment_url?: string;
  created_at: string;
  sender_id?: string;
  read_at?: string;
}

interface SupportConversation {
  id: string;
  status: string;
  created_at: string;
  messages: SupportMessage[];
}

export default function ClientOrder() {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [paymentData, setPaymentData] = useState<PaymentLink | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Support conversation state
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");

  // Dispute state
  const [disputeReason, setDisputeReason] = useState("");
  const [creatingDispute, setCreatingDispute] = useState(false);
  const [activeDispute, setActiveDispute] = useState<any>(null);
  const notFoundToasted = useRef(false);
  const paymentIdRef = useRef<string | null>(null);

  const loadSupportConversation = useCallback(async (paymentLinkId?: string) => {
    const id = paymentLinkId || paymentIdRef.current;
    if (!id) return;

    const { data, error } = await supabase.rpc('get_order_support', {
      payment_link_id_param: id,
    });

    if (error) {
      console.error('Support load error:', error);
      return;
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.conversation) {
      setConversation({
        id: result.conversation.id,
        status: result.conversation.status,
        created_at: result.conversation.created_at,
        messages: (result.conversation.messages || []).map((m: SupportMessage) => ({
          ...m,
          content: m.message || m.content,
        })),
      });
    } else {
      setConversation(null);
    }
  }, []);

  const loadActiveDispute = useCallback(async (paymentLinkId?: string) => {
    const id = paymentLinkId || paymentIdRef.current;
    if (!id) return;

    const { data } = await supabase
      .from('disputes')
      .select('*')
      .eq('payment_link_id', id)
      .eq('status', 'open')
      .maybeSingle();

    setActiveDispute(data);
  }, []);

  const loadOrderData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!linkId) return;
    const silent = opts?.silent === true;

    try {
      const { data: link, error: linkError } = await supabase
        .from('payment_links')
        .select('*')
        .eq('link_id', linkId)
        .maybeSingle();

      if (linkError || !link) {
        console.error('Order load failed', linkError);
        if (!silent && !notFoundToasted.current) {
          notFoundToasted.current = true;
          toast({
            title: 'Erreur',
            description: 'Commande introuvable',
            variant: 'destructive',
          });
        }
        return;
      }

      notFoundToasted.current = false;
      paymentIdRef.current = link.id as string;
      setPaymentData((prev) => {
        const next = link as unknown as PaymentLink;
        // Ne jamais perdre is_paid=true à cause d’un payload partiel
        if (prev?.is_paid && next && !next.is_paid) {
          return { ...next, is_paid: true };
        }
        return next;
      });

      if ((link as { provider_id?: string }).provider_id) {
        const { data: providerData } = await supabase
          .from('users')
          .select('full_name, avatar_url, rating')
          .eq('id', (link as { provider_id: string }).provider_id)
          .maybeSingle();

        if (providerData) setProvider(providerData as Provider);
      }
    } catch (err) {
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  }, [linkId, toast]);

  const refreshOrderQuiet = useCallback(async () => {
    await loadOrderData({ silent: true });
    await loadActiveDispute();
    await loadSupportConversation();
  }, [loadOrderData, loadActiveDispute, loadSupportConversation]);

  useEffect(() => {
    if (paymentData?.order_status === 'validated' && paymentData.id) {
      const timer = window.setTimeout(() => {
        supabase
          .from('reviews')
          .select('id')
          .eq('transaction_id', paymentData.id)
          .maybeSingle()
          .then(({ data }) => {
            if (!data) setShowFeedback(true);
          });
      }, 2000);
      return () => window.clearTimeout(timer);
    }
  }, [paymentData?.order_status, paymentData?.id]);

  useEffect(() => {
    void loadOrderData();
    void supabase.rpc('process_auto_escrow_releases');

    if (!linkId) return;
    const channel = supabase
      .channel(`order-${linkId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_links', filter: `link_id=eq.${linkId}` },
        (payload) => {
          const row = payload.new as PaymentLink;
          if (!row?.link_id) return;
          paymentIdRef.current = row.id;
          setPaymentData((prev) => ({
            ...(prev || ({} as PaymentLink)),
            ...row,
            is_paid: Boolean(row.is_paid ?? prev?.is_paid),
            link_id: row.link_id || prev?.link_id || linkId,
          }));
          void loadActiveDispute(row.id);
          void loadSupportConversation(row.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkId, loadOrderData, loadActiveDispute, loadSupportConversation]);

  useEffect(() => {
    if (paymentData?.id) {
      paymentIdRef.current = paymentData.id;
      void loadSupportConversation(paymentData.id);
      void loadActiveDispute(paymentData.id);
      if (paymentData.provider_id) void loadReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentData?.id, paymentData?.provider_id]);

  useEffect(() => {
    if (!loading && paymentData && paymentData.is_paid === false && linkId) {
      navigate(`/pay/${linkId}`, { replace: true });
    }
  }, [loading, paymentData?.is_paid, linkId, navigate]);

  const loadReviews = async () => {
    try {
      if (!paymentData?.provider_id) return;
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, transaction_id')
        .eq('reviewed_id', paymentData.provider_id)
        .order('created_at', { ascending: false });

      if (!allReviews?.length) {
        setReviews([]);
        setReviewCount(0);
        setAverageRating(provider?.rating ?? 0);
        return;
      }

      setReviewCount(allReviews.length);
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      setAverageRating(Number(avg.toFixed(2)));

      const withComments = allReviews.filter((r) => r.comment?.trim());
      const topThree = (withComments.length ? withComments : allReviews).slice(0, 3);

      const linkIds = topThree.map((r) => r.transaction_id);
      const { data: links } = await supabase
        .from('payment_links')
        .select('id, client_name')
        .in('id', linkIds);

      const nameByLink = Object.fromEntries(
        (links || []).map((l) => [l.id, l.client_name])
      );

      setReviews(
        topThree.map((r) => ({
          ...r,
          reviewer_name: nameByLink[r.transaction_id] || 'Client',
        }))
      );
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  };

  const handleValidateDelivery = async () => {
    if (!paymentData) return false;

    try {
      const { data, error } = await supabase.rpc('validate_order', {
        link_id_param: paymentData.link_id,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result.success) throw new Error(result.error);

      setShowFeedback(true);
      toast({
        title: 'Commande validée',
        description: `Paiement libéré (commission ${result.commission_rate}% : ${result.commission_amount})`,
      });
      loadOrderData();
      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Validation impossible';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleSubmitFeedback = async () => {
    if (!paymentData || !paymentData.provider_id) return;

    try {
      const { error: reviewError } = await supabase.from('reviews').insert({
        transaction_id: paymentData.id,
        reviewer_id: paymentData.id,
        reviewed_id: paymentData.provider_id,
        rating: feedbackRating,
        comment: feedbackComment.trim() || null,
      });

      if (reviewError) throw reviewError;

      const { data: allReviews } = await supabase.from('reviews').select('rating').eq('reviewed_id', paymentData.provider_id);
      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((s: number, r: any) => s + r.rating, 0) / allReviews.length;
        await supabase.from('users').update({ rating: Number(avg.toFixed(2)) }).eq('id', paymentData.provider_id);
      }

      setShowFeedback(false);
      setFeedbackRating(0);
      setFeedbackComment('');
      await loadReviews();
    } catch (err) {
      console.error('Error submitting review:', err);
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer votre avis', variant: 'destructive' });
    }
  };

  const handleCreateDispute = async () => {
    if (!paymentData || !disputeReason.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer la raison du litige",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingDispute(true);

      const { createDispute } = await import('@/lib/createDispute');
      const result = await createDispute({
        linkId: paymentData.link_id,
        reason: disputeReason.trim(),
        description: disputeReason.trim(),
      });

      toast({
        title: 'Litige créé',
        description: result.message || "Votre demande a été enregistrée. Notre équipe va l'examiner.",
      });

      setDisputeReason('');
      await loadActiveDispute();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de créer le litige',
        variant: 'destructive',
      });
    } finally {
      setCreatingDispute(false);
    }
  };

  const handleAutoRefund = async () => {
    if (!paymentData) return;

    // Vérifier que le prestataire n'a pas commencé
    if (paymentData.order_status !== 'paid') {
      toast({
        title: "Impossible",
        description: "Le prestataire a déjà commencé le travail. Créez un litige pour demander un remboursement.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await (supabase as any).rpc("auto_refund_if_not_started", {
        payment_link_id_param: paymentData.id,
        reason_param: "Annulation avant début des travaux"
      });

      if (error) throw error;

      toast({
        title: "Remboursement en cours",
        description: "Votre demande de remboursement a été acceptée. Vous serez remboursé sur votre moyen de paiement.",
      });

      await loadOrderData();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de traiter le remboursement",
        variant: "destructive",
      });
    }
  };

  // Render logic
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Commande introuvable</h2>
            <p className="text-muted-foreground">Le lien de commande est invalide ou a expiré.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusInfo = () => {
    const status = paymentData.is_paid ? (paymentData.order_status || 'paid') : paymentData.status;
    
    if (paymentData.refunded) {
      return {
        title: "Commande remboursée",
        description: "Votre requête a été acceptée. Vous serez remboursé sur le numéro utilisé pour le paiement.",
        icon: CheckCircle2,
        color: "text-green-600",
        bg: "bg-green-50"
      };
    }

    if (activeDispute) {
      return {
        title: "Litige en cours",
        description: "Votre demande est en cours d'examen par notre équipe.",
        icon: AlertTriangle,
        color: "text-orange-600",
        bg: "bg-orange-50"
      };
    }

    switch (status) {
      case 'pending':
        return {
          title: "En attente de paiement",
          description: "Complétez le paiement pour démarrer la commande",
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50"
        };
      case 'paid':
        return {
          title: "Paiement reçu",
          description: "En attente que le prestataire commence le travail",
          icon: CheckCircle2,
          color: "text-blue-600",
          bg: "bg-blue-50"
        };
      case 'started':
        return {
          title: "Travail en cours",
          description: "Le prestataire a commencé le travail",
          icon: Package,
          color: "text-purple-600",
          bg: "bg-purple-50"
        };
      case 'completed':
        return {
          title: "Travail terminé",
          description: "Le prestataire attend votre validation",
          icon: Check,
          color: "text-green-600",
          bg: "bg-green-50"
        };
      case 'validated':
        return {
          title: "Commande validée",
          description: "Les fonds ont été libérés au prestataire",
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50"
        };
      default:
        return {
          title: "Statut inconnu",
          description: "",
          icon: AlertTriangle,
          color: "text-gray-600",
          bg: "bg-gray-50"
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const showActions = paymentData.is_paid && !paymentData.refunded;
  const orderCurrency = paymentData.currency || 'FCFA';

  const trackerPaymentLink = useMemo(
    () => ({
      created_at: paymentData.created_at,
      paid_at: (paymentData as { paid_at?: string | null }).paid_at,
      started_at: (paymentData as { started_at?: string | null }).started_at,
      completed_at: (paymentData as { completed_at?: string | null }).completed_at,
      validated_at: (paymentData as { validated_at?: string | null }).validated_at,
      escrow_released_at: (paymentData as { escrow_released_at?: string | null }).escrow_released_at,
      is_paid: paymentData.is_paid,
    }),
    [
      paymentData.created_at,
      (paymentData as { paid_at?: string | null }).paid_at,
      (paymentData as { started_at?: string | null }).started_at,
      (paymentData as { completed_at?: string | null }).completed_at,
      (paymentData as { validated_at?: string | null }).validated_at,
      (paymentData as { escrow_released_at?: string | null }).escrow_released_at,
      paymentData.is_paid,
    ]
  );

  if (!paymentData.is_paid) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <OrderAccessGate linkId={paymentData.link_id}>
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#eef3f9] pb-[max(6rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-[#dbe6f2] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
          <Logo size="sm" />
          <span className="inline-flex max-w-[50%] items-center gap-1.5 truncate rounded-full bg-[#0b3b78]/8 px-2.5 py-1 text-[11px] font-semibold text-[#0b3b78] sm:text-xs">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            #{paymentData.link_id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-[#dbe6f2] sm:p-5"
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0b3b78]/10 sm:h-12 sm:w-12">
              <StatusIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${statusInfo.color}`} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-semibold leading-tight text-[#0b2f63] sm:text-2xl">
                {statusInfo.title}
              </h2>
              <p className="mt-1 text-sm leading-snug text-[#5c7188]">{statusInfo.description}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Main Content Area — mobile first */}
          <div className="order-2 min-w-0 space-y-4 sm:space-y-6 lg:order-1 lg:col-span-2">
                  {/* Order Details */}
                  <div className="min-w-0 space-y-3 overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-[#dbe6f2] sm:space-y-4 sm:p-5">
                      <h3 className="text-base font-semibold text-[#0b2f63]">Commande</h3>
                      <div className="min-w-0">
                        <Label className="text-sm text-[#5c7188]">Prestation</Label>
                        <p className="mt-1 break-words font-medium leading-snug text-[#0b2f63]">
                          {paymentData.description}
                        </p>
                      </div>
                      {paymentData.provider_notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <Label className="text-sm text-blue-700 font-semibold flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Notes du prestataire
                          </Label>
                          <p className="text-sm text-blue-900 mt-2">{paymentData.provider_notes}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Montant</Label>
                          <p className="font-bold text-xl mt-1">{formatAmount(paymentData.amount, orderCurrency)}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Délai</Label>
                          <p className="font-medium mt-1">{paymentData.delivery_days} jours</p>
                        </div>
                      </div>
                      {paymentData.client_name && (
                        <div>
                          <Label className="text-sm text-[#5c7188]">Client</Label>
                          <p className="mt-1 font-medium text-[#0b2f63]">{paymentData.client_name}</p>
                        </div>
                      )}
                  </div>

                  {showActions && (
                    <OrderTracker
                      linkId={paymentData.link_id}
                      orderStatus={paymentData.order_status || paymentData.status}
                      canCancel={paymentData.order_status === 'paid'}
                      amount={paymentData.amount}
                      currency={orderCurrency}
                      autoReleaseAt={paymentData.auto_release_at}
                      paymentLink={trackerPaymentLink}
                      onStatusUpdate={refreshOrderQuiet}
                      onValidateDelivery={handleValidateDelivery}
                    />
                  )}
          </div>

          {/* Sidebar — prestataire & support en premier sur mobile */}
          <div className="order-1 min-w-0 space-y-4 sm:space-y-6 lg:order-2">
            {/* Provider Info */}
            {provider && (
              <Card className="stat-card overflow-hidden">
                <CardHeader className="px-4 py-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg">Prestataire</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    {provider.avatar_url ? (
                      <img
                        src={provider.avatar_url}
                        alt={provider.full_name}
                        className="h-12 w-12 shrink-0 rounded-full shadow-md sm:h-16 sm:w-16"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 shadow-md sm:h-16 sm:w-16">
                        <span className="text-lg font-bold text-primary sm:text-xl">
                          {provider.full_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium sm:text-lg">
                        {provider.full_name || paymentData.provider_name || 'Prestataire'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={averageRating || (provider.rating ?? 0)} size="sm" showValue />
                        {reviewCount > 0 && (
                          <span className="text-xs text-muted-foreground">({reviewCount} avis)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                {reviews.length > 0 && (
                  <CardContent className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Avis récents</h4>
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="p-3 bg-gray-50 rounded">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{r.reviewer_name}</div>
                            <StarRating rating={r.rating} size="sm" />
                          </div>
                          {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Support Fidexa */}
            <ClientSupportPanel
              paymentLinkId={paymentData.id}
              clientName={paymentData.client_name}
              clientPhone={paymentData.client_phone}
              conversation={conversation}
              onUpdate={loadSupportConversation}
            />

            {/* Security Badge */}
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Paiement sécurisé</p>
                    <p className="text-xs text-muted-foreground">
                      Vos fonds sont protégés en escrow
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Modal de notation client */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" />
                Notez {provider?.full_name || paymentData.provider_name || 'le prestataire'}
              </CardTitle>
              <CardDescription>
                Votre avis aidera à améliorer nos services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Votre note</Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= feedbackRating
                            ? "fill-warning text-warning"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {feedbackRating === 0 && (
                  <p className="text-center text-sm text-muted-foreground">Sélectionnez une note</p>
                )}
              </div>
              <Textarea
                placeholder="Commentaire (optionnel)..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowFeedback(false)}>
                  Plus tard
                </Button>
                <Button variant="hero" className="flex-1" onClick={handleSubmitFeedback} disabled={feedbackRating === 0}>
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
    </OrderAccessGate>
  );
}


