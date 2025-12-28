import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import StarRating from "@/components/StarRating";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";
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
  status: string;
  is_paid: boolean;
  provider_name: string;
  provider_avatar: string | null;
  created_at: string;
}

const ClientPayment = () => {
  const { linkId } = useParams();
  const { toast } = useToast();
  const [paymentData, setPaymentData] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

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
          throw fetchError;
        }

        if (!data) {
          setError("Lien de paiement introuvable");
        } else {
          setPaymentData(data);
        }
      } catch (err) {
        console.error("Error fetching payment link:", err);
        setError("Erreur lors du chargement du lien de paiement");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentLink();
  }, [linkId]);

  const handlePay = async () => {
    if (!paymentData) return;

    try {
      const { error: updateError } = await supabase
        .from("payment_links")
        .update({ is_paid: true, status: "paid" })
        .eq("id", paymentData.id);

      if (updateError) throw updateError;

      setPaymentData({ ...paymentData, is_paid: true, status: "paid" });
      
      toast({
        title: "Paiement effectué!",
        description: "Votre paiement a été séquestré avec succès.",
      });
    } catch (err) {
      console.error("Error processing payment:", err);
      toast({
        title: "Erreur",
        description: "Impossible de traiter le paiement.",
        variant: "destructive",
      });
    }
  };

  const handleValidateDelivery = async () => {
    if (!paymentData) return;

    try {
      const { error: updateError } = await supabase
        .from("payment_links")
        .update({ status: "delivered" })
        .eq("id", paymentData.id);

      if (updateError) throw updateError;

      setPaymentData({ ...paymentData, status: "delivered" });
      
      toast({
        title: "Livraison validée!",
        description: "Le paiement a été libéré au prestataire.",
      });
      setShowFeedback(true);
    } catch (err) {
      console.error("Error validating delivery:", err);
      toast({
        title: "Erreur",
        description: "Impossible de valider la livraison.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitFeedback = () => {
    toast({
      title: "Merci pour votre avis!",
      description: "Votre feedback a été enregistré.",
    });
    setShowFeedback(false);
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
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="min-h-screen bg-secondary/30">
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

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            Paiement sécurisé
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Provider Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xl font-bold">
                    {paymentData.provider_avatar || "FX"}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-bold">
                      {paymentData.provider_name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <StarRating rating={4.8} showValue />
                      <span className="text-sm text-muted-foreground">
                        (127 avis)
                      </span>
                    </div>
                  </div>
                </div>
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
                <div className="rounded-xl bg-secondary/50 p-6 text-center">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Montant à payer
                  </p>
                  <p className="font-display text-5xl font-bold">
                    ${paymentData.amount}
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
                    <StatusBadge status={paymentData.status as OrderStatus} />
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
                  <Button
                    variant="hero"
                    size="xl"
                    className="w-full"
                    onClick={handlePay}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payer maintenant
                  </Button>
                ) : paymentData.status === "delivered" ? (
                  <div className="rounded-lg bg-success/10 p-4 text-center">
                    <Check className="mx-auto mb-2 h-8 w-8 text-success" />
                    <p className="font-medium text-success">Livraison validée</p>
                    <p className="text-sm text-muted-foreground">
                      Merci pour votre confiance!
                    </p>
                  </div>
                ) : paymentData.status === "disputed" ? (
                  <div className="rounded-lg bg-warning/10 p-4 text-center">
                    <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-warning" />
                    <p className="font-medium text-warning">Litige en cours</p>
                    <p className="text-sm text-muted-foreground">
                      Notre équipe examine votre demande.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      variant="success"
                      size="lg"
                      className="w-full"
                      onClick={handleValidateDelivery}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Valider la livraison
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => setShowDispute(true)}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Ouvrir un litige
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Feedback Modal */}
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
                Laissez votre avis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Textarea
                placeholder="Partagez votre expérience..."
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
            Paiement sécurisé par FIDEXA • Vos fonds sont protégés
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPayment;