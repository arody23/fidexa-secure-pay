import { useState } from "react";
import { Link2, Copy, Check, Send, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProvider } from "@/contexts/ProviderContext";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCurrency } from "@/lib/currency";
import { getKPayCountry, COVERAGE_COUNTRIES } from "@/lib/kpayProviders";

const CreatePaymentLink = () => {
  const { toast } = useToast();
  const { currency } = useProvider();
  const [isCreating, setIsCreating] = useState(false);
  const [linkCreated, setLinkCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkId, setLinkId] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    deliveryDays: "7",
    clientName: "",
    clientPhone: "",
    countryCode: "BJ",
  });

  const generatedLink = `${window.location.origin}/pay/${linkId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    const newLinkId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Vous devez être connecté pour créer un lien de paiement");
      }

      const country = getKPayCountry(formData.countryCode);
      const linkCurrency = normalizeCurrency(currency || "FCFA");
      const linkAmount = parseFloat(formData.amount);
      if (!Number.isFinite(linkAmount) || linkAmount <= 0) {
        throw new Error("Montant invalide");
      }
      const insertData = {
        link_id: newLinkId,
        provider_id: user.id,
        amount: linkAmount,
        currency: linkCurrency,
        description: formData.description,
        delivery_days: parseInt(formData.deliveryDays),
        client_name: formData.clientName || null,
        client_country: country.code,
        client_phone: formData.clientPhone
          ? `${country.phonePrefix}${formData.clientPhone}`
          : null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      console.log("[CreatePaymentLink] insert", {
        amount: insertData.amount,
        currency: insertData.currency,
      });

      const { error } = await supabase.from("payment_links").insert(insertData).select();

      if (error) throw error;

      setLinkId(newLinkId);
      setLinkCreated(true);

      toast({
        title: "Lien créé",
        description: "Votre lien de paiement est prêt à être partagé.",
      });
    } catch (error) {
      console.error("Error creating payment link:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de créer le lien de paiement.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = async () => {
    const ok = await copyToClipboard(generatedLink);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: ok ? "Lien copié" : "Copie manuelle",
      description: ok ? "Le lien a été copié dans le presse-papier." : "Sélectionnez et copiez le lien manuellement.",
      variant: ok ? "default" : "destructive",
    });
  };

  const shareVia = (platform: string) => {
    const message = `Bonjour. Voici le lien pour effectuer votre paiement sécurisé : ${generatedLink}`;

    switch (platform) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=Lien de paiement FidexaPay&body=${encodeURIComponent(message)}`, "_blank");
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
      clientPhone: "",
      countryCode: "BJ",
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] md:text-3xl">
        Créer un lien de paiement
      </h1>

      {!linkCreated ? (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] sm:p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-[#0b2f63]">
            <Link2 className="h-5 w-5 text-[#0b3b78]" />
            Nouveau lien de paiement
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant ({currency})</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description du service</Label>
              <Textarea
                id="description"
                placeholder="Décrivez le service ou produit..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDays">Délai de livraison (jours)</Label>
              <Input
                id="deliveryDays"
                type="number"
                value={formData.deliveryDays}
                onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                required
                min="1"
              />
            </div>

            <div className="space-y-4 rounded-xl bg-[#f7fafd] p-4 ring-1 ring-[#dbe6f2]">
              <p className="text-sm font-medium text-[#0b2f63]">Informations client (optionnel)</p>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du client</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Téléphone du client</Label>
                  <div className="flex min-w-0 gap-2">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                    >
                      <SelectTrigger
                        className="h-11 w-[4.75rem] shrink-0 px-2 [&>span]:line-clamp-none"
                        aria-label="Indicatif pays"
                      >
                        <span className="text-sm font-medium tabular-nums">
                          {getKPayCountry(formData.countryCode)?.phonePrefix ?? "+"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {COVERAGE_COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="font-medium tabular-nums">{country.phonePrefix}</span>
                            <span className="ml-2 text-[#5c7188]">{country.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="clientPhone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Numéro"
                      value={formData.clientPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clientPhone: e.target.value.replace(/[^0-9]/g, ""),
                        })
                      }
                      className="h-11 min-w-0 flex-1 text-base tracking-wide"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isCreating}>
              {isCreating ? "Création en cours..." : "Créer le lien de paiement"}
            </Button>
          </form>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] sm:p-6">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6ce0a0] text-white">
                <Check className="h-7 w-7" />
              </div>
            </div>
            <h2 className="mb-6 text-center text-xl font-semibold text-[#0b2f63]">Lien créé</h2>

            <div className="mb-6 flex items-center gap-2 rounded-xl bg-[#f7fafd] p-3 ring-1 ring-[#dbe6f2]">
              <Input
                value={generatedLink}
                readOnly
                className="min-w-0 flex-1 border-0 bg-transparent text-sm"
                onFocus={(e) => e.target.select()}
              />
              <Button variant={copied ? "default" : "outline"} size="icon" onClick={copyLink} type="button">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" onClick={() => shareVia("whatsapp")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant="outline" onClick={() => shareVia("email")}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button variant="outline" onClick={() => shareVia("sms")}>
                <Send className="mr-2 h-4 w-4" />
                SMS
              </Button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#dbe6f2] sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-[#0b2f63]">Détails du paiement</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#5c7188]">Montant</span>
                <span className="font-semibold text-[#0b2f63]">
                  {formData.amount} {currency}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-[#5c7188]">Description</span>
                <span className="max-w-[200px] truncate text-[#0b2f63]">{formData.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5c7188]">Délai</span>
                <span className="text-[#0b2f63]">{formData.deliveryDays} jours</span>
              </div>
            </div>
          </section>

          <Button variant="outline" className="w-full" onClick={resetForm}>
            Créer un autre lien
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreatePaymentLink;