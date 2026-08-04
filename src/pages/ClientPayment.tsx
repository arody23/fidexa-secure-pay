import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Clock,
  Check,
  AlertTriangle,
  CreditCard,
  Star,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import StarRating from "@/components/StarRating";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createKPayPayment, getKPayAvailability, verifyKPayPayment } from "@/lib/kpay";
import { KPAY_ENABLED } from "@/config";
import { SITE } from "@/config/site";
import { formatAmount } from "@/lib/currency";
import { getKPayCountry, KPAY_COUNTRIES } from "@/lib/kpayProviders";
import OrderTracker from "@/components/OrderTracker";

interface PaymentLink {
  id: string;
  link_id: string;
  amount: number;
  description: string;
  delivery_days: number;
  client_name: string | null;
  client_email: string | null;
  client_country?: string | null;
  client_momo_phone?: string | null;
  client_phone?: string | null;
  status: string;
  is_paid: boolean;
  order_status?: string;
  can_cancel?: boolean;
  provider_id: string;
  created_at: string;
  currency?: string | null;
  expires_at?: string | null;
  escrow_released?: boolean;
  moneyfusion_payment_id?: string | null;
  moneyfusion_escrow_id?: string | null;
  payment_url?: string | null;
  moneyfusion_status?: string | null;
}

interface Provider {
  full_name: string;
  avatar_url: string | null;
  rating?: number;
  currency?: string;
  bio?: string | null;
}

function normalizePhoneForCountry(phone: string, countryCode: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '').replace(/^00/, '');
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) return digits;
  const prefix = getKPayCountry(countryCode).phonePrefix.replace('+', '');
  if (digits.startsWith(prefix)) return digits;
  return `${prefix}${digits.replace(/^0/, '')}`;
}

const ClientPayment = () => {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<PaymentLink | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [paying, setPaying] = useState(false);
  const [awaitingKPayConfirmation, setAwaitingKPayConfirmation] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [clientCountry, setClientCountry] = useState('CD');
  const [clientMomoPhone, setClientMomoPhone] = useState('');
  const [clientWhatsAppPhone, setClientWhatsAppPhone] = useState('');
  const [availableProviderCodes, setAvailableProviderCodes] = useState<string[] | null>(null);

  const linkCurrency = paymentData?.currency || provider?.currency || 'FCFA';
  const selectedKPayCountry = getKPayCountry(clientCountry);
  const visibleProviders = selectedKPayCountry.providers.filter(
    (item) => availableProviderCodes === null || availableProviderCodes.includes(item.code)
  );

  useEffect(() => {
    const fetchPaymentLink = async () => {
      if (!linkId) {
        setError("Lien de paiement invalide");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("payment_links")
          .select("*")
          .eq("link_id", linkId)
          .maybeSingle();

        if (fetchError) {
          console.error("Erreur Supabase:", fetchError);
          throw fetchError;
        }

        if (!data) {
          setError("Lien de paiement introuvable");
          setLoading(false);
          return;
        }

        const row = data as PaymentLink;
        if (!row.is_paid && row.expires_at && new Date(row.expires_at) < new Date()) {
          setError("Ce lien de paiement a expiré (7 jours sans paiement)");
          setLoading(false);
          return;
        }

        // Charger les infos du prestataire séparément
        const { data: providerData, error: providerError } = await supabase
          .from("users")
          .select("full_name, avatar_url, currency, rating, bio")
          .eq("id", (data as any).provider_id)
          .single();

        if (providerError) {
          console.error("Erreur chargement prestataire:", providerError);
        }

        const legacyPhone = String((data as PaymentLink).client_phone || '');
        setPaymentData(data as any);
        setProvider(providerData as any || null);
        setClientCountry((data as PaymentLink).client_country || 'CD');
        setClientMomoPhone((data as PaymentLink).client_momo_phone || legacyPhone);
        setClientWhatsAppPhone(legacyPhone);
      } catch (err) {
        console.error("Error fetching payment link:", err);
        setError("Erreur lors du chargement du lien de paiement");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentLink();
  }, [linkId]);

  useEffect(() => {
    if (!KPAY_ENABLED) return;
    getKPayAvailability()
      .then((result) =>
        setAvailableProviderCodes(result.availabilityKnown ? result.availableProviderCodes : null)
      )
      .catch((availabilityError) => {
        console.warn('KPay availability unavailable:', availabilityError);
        setAvailableProviderCodes(null);
      });
  }, []);

  useEffect(() => {
    if (!loading && paymentData?.is_paid && linkId) {
      navigate(`/order/${linkId}`, { replace: true });
    }
  }, [loading, paymentData?.is_paid, linkId, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kpayStatus = params.get('kpay');
    if (!linkId || !paymentData || paymentData.is_paid || paying) return;
    if (kpayStatus !== 'success') return;

    const confirmPayment = async () => {
      setPaying(true);
      try {
        const reference = params.get('reference') || undefined;
        const result = await verifyKPayPayment(linkId, { reference });
        if (result.success || result.alreadyPaid) {
          toast({
            title: 'Paiement confirmé',
            description: 'Redirection vers votre commande...',
          });
          navigate(`/order/${linkId}`, { replace: true });
        } else if (result.pending) {
          toast({
            title: 'Paiement en cours',
            description:
              'Mobile Money peut prendre 1–2 min. Si le USSD a échoué, recliquez sur « Payer en sécurité » pour un nouveau paiement.',
          });
        } else {
          toast({
            title: 'Paiement non confirmé',
            description:
              'Statut : ' +
              (result.status || 'inconnu') +
              '. Vous pouvez réessayer le paiement.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('KPay verify error:', err);
        toast({
          title: 'Vérification en cours',
          description: 'Le webhook confirmera votre paiement sous peu.',
        });
      } finally {
        setPaying(false);
      }
    };

    confirmPayment();
  }, [linkId, paymentData, paying, navigate, toast]);

  const handlePay = async () => {
    if (!paymentData) {
      toast({
        title: "Erreur",
        description: "Données de paiement manquantes",
        variant: "destructive",
      });
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Conditions requises",
        description: "Veuillez accepter les conditions avant de payer",
        variant: "destructive",
      });
      return;
    }

    if (availableProviderCodes !== null && visibleProviders.length === 0) {
      toast({
        title: 'Paiement indisponible',
        description: 'Aucun opérateur Mobile Money n’est disponible dans ce pays actuellement.',
        variant: 'destructive',
      });
      return;
    }

    const mobileMoneyPhone = normalizePhoneForCountry(clientMomoPhone, clientCountry);
    const whatsappPhone = normalizePhoneForCountry(clientWhatsAppPhone, clientCountry);
    if (mobileMoneyPhone.length < 9) {
      toast({
        title: 'Numéro Mobile Money requis',
        description: 'Indiquez le numéro qui recevra la demande de paiement.',
        variant: 'destructive',
      });
      return;
    }
    if (whatsappPhone.length < 9) {
      toast({
        title: 'Numéro WhatsApp requis',
        description: 'Indiquez le numéro qui recevra le code d’accès au suivi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setPaying(true);

      const { error: contactUpdateError } = await supabase
        .from('payment_links')
        .update({
          client_country: clientCountry,
          client_momo_phone: mobileMoneyPhone,
          client_phone: whatsappPhone,
        })
        .eq('id', paymentData.id);
      if (contactUpdateError) throw contactUpdateError;

      if (KPAY_ENABLED) {
        const result = await createKPayPayment({
          linkId: paymentData.link_id,
          customerName: paymentData.client_name || undefined,
          customerEmail: paymentData.client_email || undefined,
          phoneNumber: mobileMoneyPhone,
          // Nouveau checkout à chaque clic — évite les sessions GATEWAY « pending » bloquées
          forceNew: true,
        });

        if (result.alreadyPaid) {
          navigate(`/order/${linkId}`, { replace: true });
          return;
        }

        if (result.checkoutUrl && result.paymentMode !== 'ussd') {
          window.location.href = result.checkoutUrl;
          return;
        }

        if (!result.paymentId) {
          throw new Error('Identifiant de paiement KPay manquant');
        }

        setAwaitingKPayConfirmation(true);
        toast({
          title: 'Validez le paiement sur votre téléphone',
          description: `Une demande ${result.provider || 'Mobile Money'} a été envoyée pour ${result.amount} ${result.currency}.`,
        });

        const pollPayment = async (remainingAttempts: number): Promise<void> => {
          try {
            const verification = await verifyKPayPayment(paymentData.link_id, {
              paymentId: result.paymentId,
              reference: result.reference,
            });
            if (verification.success || verification.alreadyPaid) {
              navigate(`/order/${linkId}`, { replace: true });
              return;
            }
            if (verification.pending && remainingAttempts > 0) {
              window.setTimeout(() => void pollPayment(remainingAttempts - 1), 5000);
              return;
            }
          } catch (pollError) {
            console.warn('KPay payment polling failed:', pollError);
          }
          setAwaitingKPayConfirmation(false);
          toast({
            title: 'Paiement non confirmé',
            description: 'Le paiement n’a pas été validé. Vous pouvez réessayer.',
            variant: 'destructive',
          });
        };

        window.setTimeout(() => void pollPayment(18), 5000);
        return;
      }

      throw new Error('Le paiement KPay n’est pas configuré.');
    } catch (err) {
      console.error("❌ ERROR in handlePay:", err);
      console.error("Error details:", {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      
      // Afficher plus de détails sur l'erreur
      let errorMessage = "Impossible de traiter le paiement.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = "Impossible de contacter le serveur de paiement. Vérifiez votre connexion internet.";
      }
      
      toast({
        title: "Erreur de paiement",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  const handleValidateDelivery = async () => {
    if (!paymentData) return false;

    try {
      console.log("🔍 Validation démarrage...", paymentData.link_id);

      // UPDATE direct - simple et efficace
      const { data: updateData, error: updateError } = await supabase
        .from("payment_links")
        .update({ 
          status: "validated",
          order_status: "validated",
          escrow_released: true 
        })
        .eq("link_id", paymentData.link_id)
        .select()
        .single();

      console.log("🔍 Résultat:", { updateData, updateError });

      if (updateError) {
        console.error("❌ Erreur:", updateError);
        toast({
          title: "❌ Erreur",
          description: updateError.message,
          variant: "destructive"
        });
        return false;
      }

      // Succès ! Mettre à jour l'état local IMMÉDIATEMENT
      setPaymentData({ 
        ...paymentData, 
        status: "validated", 
        order_status: "validated",
        escrow_released: true 
      });
      
      toast({
        title: "✅ Commande validée!",
        description: "Le paiement a été libéré.",
      });
      
      // Afficher le modal de notation
      setShowFeedback(true);
      return true;

    } catch (err) {
      console.error("❌ Exception:", err);
      toast({
        title: "❌ Erreur",
        description: "Impossible de valider",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleSubmitFeedback = async () => {
    if (!paymentData || !provider) return;

    try {
      // Enregistrer la review
      const { error: reviewError } = await supabase
        .from("reviews")
        .insert({
          transaction_id: paymentData.id,
          reviewer_id: paymentData.id,
          reviewed_id: paymentData.provider_id,
          rating: feedbackRating,
          comment: feedbackComment.trim() || null,
        });

      if (reviewError) throw reviewError;

      // Calculer la nouvelle moyenne
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewed_id", paymentData.provider_id);

      if (allReviews && allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length;
        await supabase
          .from("users")
          .update({ rating: Number(avgRating.toFixed(2)) } as any)
          .eq("id", paymentData.provider_id);
      }

      // Notification
      await supabase.from("notifications").insert({
        user_id: paymentData.provider_id,
        type: "system",
        title: "Nouvel avis reçu ⭐",
        message: `Note: ${feedbackRating}/5 étoiles`,
        link: "/dashboard/profile"
      });

      toast({
        title: "Merci!",
        description: "Votre avis a été enregistré.",
      });
      
      setShowFeedback(false);
    } catch (err) {
      console.error("Error:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre avis.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDispute = async () => {
    if (!paymentData) return;

    try {
      const { error: updateError } = await supabase
        .from("payment_links")
        .update({ status: "disputed" })
        .eq("id", paymentData.id);

      if (updateError) throw updateError;

      setPaymentData({ ...paymentData, status: "disputed" });
      
      toast({
        title: "Litige ouvert",
        description: "Notre équipe va examiner votre demande.",
      });
      setShowDispute(false);
    } catch (err) {
      console.error("Error opening dispute:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le litige.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Logo />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-warning" />
              <h2 className="mb-2 font-display text-xl font-bold">
                {error || "Lien introuvable"}
              </h2>
              <p className="text-muted-foreground">
                Ce lien de paiement n'existe pas ou a expiré.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (paymentData.is_paid) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirection vers votre commande...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:h-16">
          <Logo size="sm" />
          <Badge variant="outline" className="gap-1 text-xs">
            <Shield className="h-3 w-3" />
            Paiement sécurisé
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-32 md:pb-8">
        <div className="space-y-6">
          {/* Provider Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {/* Avatar du prestataire */}
                  {provider?.avatar_url ? (
                    <img 
                      src={provider.avatar_url}
                      alt={provider.full_name}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xl font-bold ring-2 ring-primary/20">
                      {provider?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl font-bold">
                      {provider?.full_name || 'Prestataire'}
                    </h2>
                    <div className="flex items-center gap-2">
                      <StarRating rating={provider?.rating || 0} showValue />
                      {provider?.rating && (
                        <span className="text-sm text-muted-foreground">
                          ({provider.rating.toFixed(1)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {provider?.bio?.trim() ? (
                  <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                    {provider.bio.trim()}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Détails du paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Montant à payer
                  </p>
                  <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                    {formatAmount(paymentData.amount, linkCurrency)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Le montant est converti au taux KPay en vigueur dans la devise de votre opérateur, si nécessaire.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-right max-w-[250px]">
                      {paymentData.description}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Délai de livraison
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {paymentData.delivery_days} jours
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Statut</span>
                    <StatusBadge status={(paymentData.is_paid ? (paymentData.status === 'pending' ? 'paid' : paymentData.status) : paymentData.status) as OrderStatus} />
                  </div>
                </div>

                {/* Escrow Info */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Paiement séquestré</p>
                      <p className="text-sm text-muted-foreground">
                        Votre paiement est sécurisé et ne sera libéré qu'après
                        validation de la livraison.
                      </p>
                    </div>
                  </div>
                </div>

                {!paymentData.is_paid ? (
                  <>
                    <div className="space-y-4 rounded-lg border border-border p-3 sm:p-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientCountry" className="text-sm font-medium">
                          Pays du client
                        </Label>
                        <Select value={clientCountry} onValueChange={setClientCountry}>
                          <SelectTrigger id="clientCountry">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KPAY_COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.phonePrefix} {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Vérifiez ou corrigez le pays avant de saisir le numéro Mobile Money.
                        </p>
                      </div>

                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs font-medium text-foreground">
                          Moyens de paiement disponibles au {selectedKPayCountry.name}
                        </p>
                        {visibleProviders.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {visibleProviders.map((providerOption) => (
                              <Badge key={providerOption.code} variant="secondary">
                                {providerOption.label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Aucun opérateur disponible pour ce pays actuellement.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientMomoPhone" className="text-sm font-medium">
                          Numéro Mobile Money
                        </Label>
                        <Input
                          id="clientMomoPhone"
                          type="tel"
                          inputMode="tel"
                          placeholder={`${selectedKPayCountry.phonePrefix} 8XXXXXXX`}
                          value={clientMomoPhone}
                          onChange={(event) => setClientMomoPhone(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Ce numéro recevra uniquement la demande de paiement USSD.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientWhatsAppPhone" className="text-sm font-medium">
                          Numéro WhatsApp pour le code de suivi
                        </Label>
                        <Input
                          id="clientWhatsAppPhone"
                          type="tel"
                          inputMode="tel"
                          placeholder={`${selectedKPayCountry.phonePrefix} 8XXXXXXX`}
                          value={clientWhatsAppPhone}
                          onChange={(event) => setClientWhatsAppPhone(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Ce numéro recevra le code WhatsApp après la confirmation du paiement.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
                      <p className="text-sm font-medium text-foreground">
                        Conditions applicables avant le paiement
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        En cliquant sur « Payer en sécurité », vous confirmez avoir lu et accepté les{' '}
                        <Link
                          to={SITE.legal.prePayment}
                          className="text-primary underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          conditions applicables avant le paiement
                        </Link>
                        .
                      </p>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={acceptedTerms}
                          onCheckedChange={(v) => setAcceptedTerms(v === true)}
                          className="mt-0.5 shrink-0"
                        />
                        <label
                          htmlFor="terms"
                          className="min-w-0 cursor-pointer text-xs leading-relaxed text-muted-foreground sm:text-sm"
                        >
                          J&apos;ai lu et j&apos;accepte les{' '}
                          <Link
                            to={SITE.legal.terms}
                            className="text-primary underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Conditions d&apos;utilisation
                          </Link>
                          , la{' '}
                          <Link
                            to={SITE.legal.privacy}
                            className="text-primary underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Politique de confidentialité
                          </Link>
                          , la{' '}
                          <Link
                            to={SITE.legal.escrow}
                            className="text-primary underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Politique de paiement sécurisé
                          </Link>
                          , la{' '}
                          <Link
                            to={SITE.legal.refund}
                            className="text-primary underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Politique de remboursement
                          </Link>{' '}
                          et la{' '}
                          <Link
                            to={SITE.legal.disputes}
                            className="text-primary underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Politique de gestion des litiges
                          </Link>{' '}
                          de FidexaPay.
                        </label>
                      </div>
                    </div>

                    <Button
                      variant="hero"
                      size="xl"
                      className="hidden w-full md:flex"
                      onClick={handlePay}
                      disabled={paying || awaitingKPayConfirmation || !acceptedTerms}
                    >
                      {paying ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-5 w-5" />
                      )}
                      {paying ? 'Initialisation...' : awaitingKPayConfirmation ? 'Validation en attente...' : 'Payer en sécurité'}
                    </Button>
                  </>
                ) : (
                  <OrderTracker
                    linkId={linkId || ''}
                    orderStatus={paymentData.status || paymentData.order_status || 'paid'}
                    canCancel={paymentData.can_cancel !== false}
                    amount={paymentData.amount}
                    onStatusUpdate={() => {
                      // Recharger les données
                      window.location.reload();
                    }}
                    onValidateDelivery={handleValidateDelivery}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Barre de paiement fixe — mobile first */}
      {!paymentData.is_paid && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-xl font-bold">
              {formatAmount(paymentData.amount, linkCurrency)}
            </span>
          </div>
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handlePay}
            disabled={paying || awaitingKPayConfirmation || !acceptedTerms}
          >
            {paying ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Shield className="mr-2 h-5 w-5" />
            )}
            {paying ? 'Initialisation…' : awaitingKPayConfirmation ? 'Validation en attente…' : 'Payer en sécurité'}
          </Button>
        </div>
      )}

      {/* Modal de notation */}
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
                Notez {provider?.full_name || 'le prestataire'}
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
                  <p className="text-center text-sm text-muted-foreground">
                    Sélectionnez une note
                  </p>
                )}
              </div>
              <Textarea
                placeholder="Commentaire (optionnel)..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowFeedback(false)}
                >
                  Plus tard
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleSubmitFeedback}
                  disabled={feedbackRating === 0}
                >
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dispute Modal */}
      {showDispute && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Ouvrir un litige
              </CardTitle>
              <CardDescription>
                Décrivez le problème rencontré
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Expliquez la raison du litige..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
              />
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Ajoutez des preuves (photos, documents)
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDispute(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="warning"
                  className="flex-1"
                  onClick={handleOpenDispute}
                >
                  Ouvrir le litige
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-border py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Paiement sécurisé par FidexaPay • Vos fonds sont protégés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPayment;