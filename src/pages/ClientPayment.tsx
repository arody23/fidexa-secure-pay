import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  AlertTriangle,
  Star,
  Upload,
  Loader2,
} from "lucide-react";
import EscrowMark from "@/components/brand/EscrowMark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getKPayCountry, COVERAGE_COUNTRIES } from "@/lib/kpayProviders";
import { ProviderNetworkIcon, WhatsAppBrandIcon } from "@/components/brand/ProviderNetworkIcon";
import OrderTracker from "@/components/OrderTracker";
import {
  WORLD_DIAL_CODES,
  composeE164,
  toNationalPhoneDigits,
} from "@/lib/worldDialCodes";

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
  return composeE164(getKPayCountry(countryCode).phonePrefix, phone);
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
  const [whatsappDialKey, setWhatsappDialKey] = useState('CD:+243');
  const [availableProviderCodes, setAvailableProviderCodes] = useState<string[] | null>(null);

  const linkCurrency = paymentData?.currency || provider?.currency || 'FCFA';
  const selectedKPayCountry = getKPayCountry(clientCountry);
  const whatsappDial = whatsappDialKey.includes(':')
    ? whatsappDialKey.split(':').slice(1).join(':')
    : whatsappDialKey;

  useEffect(() => {
    const c = getKPayCountry(clientCountry);
    setWhatsappDialKey(`${c.code}:${c.phonePrefix}`);
  }, [clientCountry]);
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
        const countryCode = (data as PaymentLink).client_country || 'CD';
        const momoPrefix = getKPayCountry(countryCode).phonePrefix;
        setPaymentData(data as any);
        setProvider(providerData as any || null);
        setClientCountry(countryCode);
        setClientMomoPhone(
          toNationalPhoneDigits(
            String((data as PaymentLink).client_momo_phone || legacyPhone),
            momoPrefix
          )
        );
        setClientWhatsAppPhone(toNationalPhoneDigits(legacyPhone, momoPrefix));
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
    const whatsappPhone = composeE164(whatsappDial, clientWhatsAppPhone);
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
    <div className="min-h-[100dvh] bg-[#eef3f9]">
      <header className="sticky top-0 z-30 border-b border-[#dbe6f2] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:h-16">
          <Logo size="sm" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b3b78]/8 px-3 py-1 text-xs font-semibold text-[#0b3b78]">
            <EscrowMark className="h-3.5 w-3.5" strokeWidth={1.7} />
            Escrow
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-32 md:pb-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2]"
        >
          <div className="flex items-center gap-4">
            {provider?.avatar_url ? (
              <img
                src={provider.avatar_url}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b3b78] text-lg font-bold text-white">
                {provider?.full_name?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-[#0b2f63]">
                {provider?.full_name || "Prestataire"}
              </h1>
              <StarRating rating={provider?.rating || 0} showValue />
            </div>
          </div>
          {provider?.bio?.trim() ? (
            <p className="mt-4 border-t border-[#eef3f9] pt-4 text-sm leading-relaxed text-[#5c7188]">
              {provider.bio.trim()}
            </p>
          ) : null}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2]"
        >
          <div className="rounded-2xl bg-[#0b3b78] px-5 py-6 text-center text-white">
            <p className="text-sm font-medium text-white/70">Montant</p>
            <p className="mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {formatAmount(paymentData.amount, linkCurrency)}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#5c7188]">Prestation</span>
              <span className="max-w-[60%] text-right font-medium text-[#0b2f63]">
                {paymentData.description}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5c7188]">Délai</span>
              <span className="font-medium text-[#0b2f63]">{paymentData.delivery_days} j</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#5c7188]">Statut</span>
              <StatusBadge
                status={
                  (paymentData.is_paid
                    ? paymentData.status === "pending"
                      ? "paid"
                      : paymentData.status
                    : paymentData.status) as OrderStatus
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-[#f3f7fc] px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3b78] text-white">
              <EscrowMark className="h-5 w-5" strokeWidth={1.55} />
            </div>
            <p className="text-sm font-medium text-[#0b2f63]">
              Fonds protégés jusqu’à validation de la livraison
            </p>
          </div>

          {!paymentData.is_paid ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientCountry" className="text-sm font-medium text-[#0b2f63]">
                    Pays de paiement
                  </Label>
                  <Select value={clientCountry} onValueChange={setClientCountry}>
                    <SelectTrigger id="clientCountry" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COVERAGE_COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="inline-flex items-center gap-2">
                            <img
                              src={`/assets/flags/${country.code.toLowerCase()}.svg`}
                              alt=""
                              className="h-4 w-6 rounded-[2px] object-cover"
                            />
                            {country.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {visibleProviders.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f7fafd] px-3 py-3">
                    {visibleProviders.map((providerOption) => (
                      <ProviderNetworkIcon
                        key={providerOption.code}
                        label={providerOption.label}
                        className="h-9 max-w-[6.5rem]"
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="clientMomoPhone" className="text-sm font-medium text-[#0b2f63]">
                    Mobile Money
                  </Label>
                  <div className="flex min-w-0 gap-2">
                    <span className="inline-flex h-11 shrink-0 items-center rounded-md border border-input bg-[#f6f9fd] px-3 text-sm font-medium tabular-nums text-[#0b3b78]">
                      {selectedKPayCountry.phonePrefix}
                    </span>
                    <Input
                      id="clientMomoPhone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="812 345 678"
                      value={clientMomoPhone}
                      onChange={(event) =>
                        setClientMomoPhone(
                          toNationalPhoneDigits(event.target.value, selectedKPayCountry.phonePrefix)
                        )
                      }
                      className="h-11 min-w-0 flex-1 text-base placeholder:text-[#a8b8ca]"
                    />
                  </div>
                  <p className="text-[11px] text-[#8a9bb0]">Sans indicatif — uniquement le numéro local</p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="clientWhatsAppPhone"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#0b2f63]"
                  >
                    <WhatsAppBrandIcon className="h-4 w-4 text-[#25D366]" />
                    WhatsApp (suivi)
                  </Label>
                  <div className="flex min-w-0 gap-2">
                    <Select value={whatsappDialKey} onValueChange={setWhatsappDialKey}>
                      <SelectTrigger className="h-11 w-[8.25rem] shrink-0 tabular-nums">
                        <SelectValue placeholder="+…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {WORLD_DIAL_CODES.map((c) => (
                          <SelectItem key={`${c.code}-${c.dial}`} value={`${c.code}:${c.dial}`}>
                            <span className="inline-flex items-center gap-2">
                              <span className="tabular-nums text-[#0b3b78]">{c.dial}</span>
                              <span className="truncate text-muted-foreground">{c.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="clientWhatsAppPhone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="812 345 678"
                      value={clientWhatsAppPhone}
                      onChange={(event) =>
                        setClientWhatsAppPhone(toNationalPhoneDigits(event.target.value, whatsappDial))
                      }
                      className="h-11 min-w-0 flex-1 text-base placeholder:text-[#a8b8ca]"
                    />
                  </div>
                  <p className="text-[11px] text-[#8a9bb0]">
                    Choisissez l’indicatif, puis le numéro sans le préfixe pays
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-[#eef3f9] pt-4">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor="terms"
                  className="min-w-0 cursor-pointer text-xs leading-relaxed text-[#5c7188]"
                >
                  J’accepte les{" "}
                  <Link to={SITE.legal.terms} className="font-medium text-[#0b3b78] underline" target="_blank" rel="noopener noreferrer">
                    CGU
                  </Link>
                  , la{" "}
                  <Link to={SITE.legal.privacy} className="font-medium text-[#0b3b78] underline" target="_blank" rel="noopener noreferrer">
                    confidentialité
                  </Link>{" "}
                  et les{" "}
                  <Link to={SITE.legal.prePayment} className="font-medium text-[#0b3b78] underline" target="_blank" rel="noopener noreferrer">
                    conditions de paiement
                  </Link>
                  .
                </label>
              </div>

              <Button
                size="xl"
                className="hidden w-full bg-[#0b3b78] hover:bg-[#0a3266] md:flex"
                onClick={handlePay}
                disabled={paying || awaitingKPayConfirmation || !acceptedTerms}
              >
                {paying ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <EscrowMark className="mr-2 h-5 w-5" />
                )}
                {paying
                  ? "Initialisation…"
                  : awaitingKPayConfirmation
                    ? "Validation en attente…"
                    : "Payer"}
              </Button>
            </>
          ) : (
            <OrderTracker
              linkId={linkId || ""}
              orderStatus={paymentData.status || paymentData.order_status || "paid"}
              canCancel={paymentData.can_cancel !== false}
              amount={paymentData.amount}
              onStatusUpdate={() => {
                window.location.reload();
              }}
              onValidateDelivery={handleValidateDelivery}
            />
          )}
        </motion.section>
      </main>

      {/* Barre de paiement fixe — mobile first */}
      {!paymentData.is_paid && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dbe6f2] bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-[#5c7188]">Total</span>
            <span className="font-display text-xl font-bold tabular-nums text-[#0b2f63]">
              {formatAmount(paymentData.amount, linkCurrency)}
            </span>
          </div>
          <Button
            size="lg"
            className="w-full bg-[#0b3b78] hover:bg-[#0a3266]"
            onClick={handlePay}
            disabled={paying || awaitingKPayConfirmation || !acceptedTerms}
          >
            {paying ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <EscrowMark className="mr-2 h-5 w-5" />
            )}
            {paying ? "Initialisation…" : awaitingKPayConfirmation ? "Validation en attente…" : "Payer"}
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