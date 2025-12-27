import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Clock,
  Check,
  AlertTriangle,
  CreditCard,
  User,
  Star,
  Upload,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import StarRating from "@/components/StarRating";
import StatusBadge, { OrderStatus } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";

// Mock data for the payment link
const mockPaymentData = {
  id: "PAY-abc123xyz789",
  provider: {
    name: "Design Studio Pro",
    avatar: "DS",
    rating: 4.8,
    reviews: 127,
  },
  amount: 250,
  description: "Design logo entreprise - Logo professionnel avec 3 propositions et révisions illimitées",
  deliveryDays: 7,
  status: "pending" as OrderStatus,
  isPaid: true,
  createdAt: "2024-01-15",
  orders: [
    {
      id: "ORD-001",
      amount: 250,
      description: "Design logo entreprise",
      status: "pending" as OrderStatus,
      date: "2024-01-15",
    },
    {
      id: "ORD-002",
      amount: 150,
      description: "Cartes de visite",
      status: "delivered" as OrderStatus,
      date: "2024-01-10",
    },
  ],
};

const ClientPayment = () => {
  const { linkId } = useParams();
  const { toast } = useToast();
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  const handlePay = () => {
    toast({
      title: "Redirection vers le paiement...",
      description: "Vous allez être redirigé vers Flutterwave.",
    });
  };

  const handleValidateDelivery = () => {
    toast({
      title: "Livraison validée!",
      description: "Le paiement a été libéré au prestataire.",
    });
    setShowFeedback(true);
  };

  const handleSubmitFeedback = () => {
    toast({
      title: "Merci pour votre avis!",
      description: "Votre feedback a été enregistré.",
    });
    setShowFeedback(false);
  };

  const handleOpenDispute = () => {
    toast({
      title: "Litige ouvert",
      description: "Notre équipe va examiner votre demande.",
    });
    setShowDispute(false);
  };

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
                    {mockPaymentData.provider.avatar}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-xl font-bold">
                      {mockPaymentData.provider.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <StarRating
                        rating={mockPaymentData.provider.rating}
                        showValue
                      />
                      <span className="text-sm text-muted-foreground">
                        ({mockPaymentData.provider.reviews} avis)
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
                    ${mockPaymentData.amount}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-right max-w-[250px]">
                      {mockPaymentData.description}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Délai de livraison
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {mockPaymentData.deliveryDays} jours
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Statut</span>
                    <StatusBadge status={mockPaymentData.status} />
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

                {!mockPaymentData.isPaid ? (
                  <Button
                    variant="hero"
                    size="xl"
                    className="w-full"
                    onClick={handlePay}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payer maintenant
                  </Button>
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

          {/* Order History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Historique des commandes
                </CardTitle>
                <CardDescription>
                  Toutes vos commandes avec ce prestataire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockPaymentData.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="font-medium">{order.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.id} • {order.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">${order.amount}</p>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

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
        </div>
      </main>

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
