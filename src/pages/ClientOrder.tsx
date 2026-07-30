import { useState, useEffect } from "react";
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
    loadOrderData();
    supabase.rpc('process_auto_escrow_releases');

    if (!linkId) return;
    const channel = supabase
      .channel(`order-${linkId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payment_links', filter: `link_id=eq.${linkId}` },
        (payload) => {
          setPaymentData(payload.new as PaymentLink);
          loadActiveDispute();
          loadSupportConversation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkId]);

  useEffect(() => {
    if (paymentData?.id) {
      loadSupportConversation();
      loadActiveDispute();
      if (paymentData.provider_id) loadReviews();
    }
  }, [paymentData?.id, paymentData?.provider_id]);

  useEffect(() => {
    if (!loading && paymentData && !paymentData.is_paid && linkId) {
      navigate(`/pay/${linkId}`, { replace: true });
    }
  }, [loading, paymentData, linkId, navigate]);

  const loadOrderData = async () => {
    if (!linkId) return;

    try {
      const { data: link, error: linkError } = await supabase
        .from("payment_links")
        .select("*")
        .eq("link_id", linkId)
        .single();

      if (linkError || !link) {
        toast({
          title: "Erreur",
          description: "Commande introuvable",
          variant: "destructive",
        });
        return;
      }

      setPaymentData(link as any);
      if (import.meta.env.DEV) {
        console.log('[ClientOrder] loadOrderData -> paymentData', link);
      }

      // Charger info prestataire
      if ((link as any).provider_id) {
        const { data: providerData } = await supabase
          .from("users")
          .select("full_name, avatar_url, rating")
          .eq("id", (link as any).provider_id)
          .single();

        if (providerData) {
          setProvider(providerData as Provider);
        }
      }
    } catch (err) {
      console.error("Error loading order:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSupportConversation = async () => {
    if (!paymentData?.id) return;

    const { data, error } = await supabase.rpc('get_order_support', {
      payment_link_id_param: paymentData.id,
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
  };

  const loadActiveDispute = async () => {
    if (!paymentData?.id) return;

    const result: any = await supabase
      .from("disputes")
      .select("*")
      .eq("payment_link_id", paymentData.id)
      .eq("status", "open")
      .maybeSingle();
    
    setActiveDispute(result.data);
  };

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

      const { data, error } = await supabase.rpc('create_dispute', {
        link_id_param: paymentData.link_id,
        reason_param: disputeReason.trim(),
        description_param: disputeReason.trim(),
      });

      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) throw new Error(result?.error || 'Erreur');

      toast({
        title: "Litige créé",
        description: "Votre demande a été enregistrée. Notre équipe va l'examiner.",
      });

      setDisputeReason("");
      await loadActiveDispute();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de créer le litige",
        variant: "destructive",
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
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

  if (!paymentData.is_paid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24 overflow-x-hidden">
      {/* Header sticky mobile */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
          <Logo size="sm" />
          <Badge variant="outline" className="gap-1 text-xs sm:text-sm">
            <Shield className="h-3 w-3" />
            <span className="hidden xs:inline">Escrow</span>
            #{paymentData.link_id.slice(0, 8).toUpperCase()}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <StatusIcon className={`h-10 w-10 shrink-0 sm:h-12 sm:w-12 ${statusInfo.color}`} />
                <div className="flex-1">
                  <h2 className="text-xl font-bold sm:text-2xl">{statusInfo.title}</h2>
                  <p className="text-sm text-muted-foreground sm:text-base">{statusInfo.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content Area — mobile first */}
          <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
                  {/* Order Details */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Détails de la commande</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Description</Label>
                        <p className="font-medium mt-1">{paymentData.description}</p>
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
                          <Label className="text-sm text-muted-foreground">Client</Label>
                          <p className="font-medium mt-1">{paymentData.client_name}</p>
                          {paymentData.client_phone && (
                            <p className="text-sm text-muted-foreground">{paymentData.client_phone}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {showActions && (
                    <OrderTracker
                      linkId={paymentData.link_id}
                      orderStatus={paymentData.order_status || paymentData.status}
                      canCancel={paymentData.order_status === 'paid'}
                      amount={paymentData.amount}
                      currency={orderCurrency}
                      autoReleaseAt={paymentData.auto_release_at}
                      paymentLink={{
                        created_at: paymentData.created_at,
                        paid_at: (paymentData as { paid_at?: string | null }).paid_at,
                        started_at: (paymentData as { started_at?: string | null }).started_at,
                        completed_at: (paymentData as { completed_at?: string | null }).completed_at,
                        validated_at: (paymentData as { validated_at?: string | null }).validated_at,
                        escrow_released_at: (paymentData as { escrow_released_at?: string | null }).escrow_released_at,
                        is_paid: paymentData.is_paid,
                      }}
                      onStatusUpdate={async () => {
                        await loadOrderData();
                        await loadActiveDispute();
                        await loadSupportConversation();
                      }}
                      onValidateDelivery={handleValidateDelivery}
                    />
                  )}
          </div>

          {/* Sidebar — prestataire & support en premier sur mobile */}
          <div className="order-1 space-y-6 lg:order-2">
            {/* Provider Info */}
            {provider && (
              <Card className="stat-card">
                <CardHeader>
                  <CardTitle className="text-lg">Prestataire</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {provider.avatar_url ? (
                      <img
                        src={provider.avatar_url}
                        alt={provider.full_name}
                        className="w-16 h-16 rounded-full shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shadow-md">
                        <span className="text-xl font-bold text-primary">
                          {provider.full_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-lg">{provider.full_name || paymentData.provider_name || 'Prestataire'}</p>
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
  );
}


