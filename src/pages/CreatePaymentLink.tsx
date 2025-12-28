import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, Check, Send, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

const CreatePaymentLink = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [linkCreated, setLinkCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkId, setLinkId] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    deliveryDays: "7",
    clientName: "",
    clientEmail: "",
  });

  // Generate the payment link using the current origin
  const generatedLink = `${window.location.origin}/pay/${linkId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    // Generate a unique link ID
    const newLinkId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setLinkId(newLinkId);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsCreating(false);
    setLinkCreated(true);
    
    toast({
      title: "Lien créé avec succès!",
      description: "Votre lien de paiement est prêt à être partagé.",
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Lien copié!",
      description: "Le lien a été copié dans votre presse-papier.",
    });
  };

  const shareVia = (platform: string) => {
    const message = `Bonjour! Voici le lien pour effectuer votre paiement sécurisé: ${generatedLink}`;
    
    switch (platform) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        break;
      case "email":
        window.open(`mailto:${formData.clientEmail}?subject=Lien de paiement FIDEXA&body=${encodeURIComponent(message)}`, "_blank");
        break;
      case "sms":
        window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
        break;
    }
  };

  const resetForm = () => {
    setLinkCreated(false);
    setLinkId("");
    setFormData({
      amount: "",
      description: "",
      deliveryDays: "7",
      clientName: "",
      clientEmail: "",
    });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            Créer un lien de paiement
          </h1>
          <p className="text-muted-foreground">
            Générez un lien sécurisé à envoyer à votre client.
          </p>
        </div>

        {!linkCreated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  Nouveau lien de paiement
                </CardTitle>
                <CardDescription>
                  Remplissez les informations pour créer votre lien.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                      min="1"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description du service</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez le service ou produit..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required
                      rows={3}
                    />
                  </div>

                  {/* Delivery Days */}
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDays">Délai de livraison (jours)</Label>
                    <Input
                      id="deliveryDays"
                      type="number"
                      placeholder="7"
                      value={formData.deliveryDays}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryDays: e.target.value })
                      }
                      required
                      min="1"
                    />
                  </div>

                  {/* Client Info (Optional) */}
                  <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
                    <p className="text-sm font-medium">
                      Informations client (optionnel)
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Nom du client</Label>
                        <Input
                          id="clientName"
                          placeholder="Jean Dupont"
                          value={formData.clientName}
                          onChange={(e) =>
                            setFormData({ ...formData, clientName: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Email du client</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          placeholder="client@email.com"
                          value={formData.clientEmail}
                          onChange={(e) =>
                            setFormData({ ...formData, clientEmail: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                        />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <Link2 className="mr-2 h-4 w-4" />
                        Créer le lien de paiement
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Success Card */}
            <Card className="border-success/30 bg-success/5">
              <CardContent className="pt-6">
                <div className="mb-6 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground"
                  >
                    <Check className="h-8 w-8" />
                  </motion.div>
                </div>
                <h2 className="mb-2 text-center font-display text-xl font-bold">
                  Lien créé avec succès!
                </h2>
                <p className="mb-6 text-center text-muted-foreground">
                  Partagez ce lien avec votre client pour recevoir le paiement.
                </p>

                {/* Link Display */}
                <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-card p-3">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="border-0 bg-transparent focus-visible:ring-0"
                  />
                  <Button
                    variant={copied ? "success" : "outline"}
                    size="icon"
                    onClick={copyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Share Options */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => shareVia("whatsapp")}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => shareVia("email")}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => shareVia("sms")}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    SMS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Détails du paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-semibold">${formData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-right max-w-[200px] truncate">
                      {formData.description}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Délai</span>
                    <span>{formData.deliveryDays} jours</span>
                  </div>
                  {formData.clientName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client</span>
                      <span>{formData.clientName}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={resetForm}>
              Créer un autre lien
            </Button>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreatePaymentLink;
