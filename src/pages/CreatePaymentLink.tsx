import { useState } from "react";

import { Copy, Check, Send, MessageCircle, Mail } from "lucide-react";

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

    <div className="mx-auto w-full max-w-2xl space-y-8 overflow-x-hidden">

      <h1 className="text-2xl font-semibold tracking-tight text-[#0b2f63] sm:text-3xl">

        Créer un lien de paiement

      </h1>



      {!linkCreated ? (

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="min-w-0 space-y-1.5">

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



          <div className="min-w-0 space-y-1.5">

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



          <div className="min-w-0 space-y-1.5">

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



          <div className="h-px bg-[#e4edf6]" />



          <p className="text-sm font-medium text-[#0b2f63]">Client (optionnel)</p>



          <div className="min-w-0 space-y-1.5">

            <Label htmlFor="clientName">Nom du client</Label>

            <Input

              id="clientName"

              value={formData.clientName}

              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}

            />

          </div>



          <div className="min-w-0 space-y-1.5">

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



          <Button

            type="submit"

            size="lg"

            className="w-full bg-[#0b3b78] hover:bg-[#0a3266]"

            disabled={isCreating}

          >

            {isCreating ? "Création en cours..." : "Créer le lien de paiement"}

          </Button>

        </form>

      ) : (

        <div className="space-y-8">

          <div className="flex flex-col items-center gap-2 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6ce0a0] text-white">

              <Check className="h-6 w-6" />

            </div>

            <p className="text-lg font-semibold text-[#0b2f63]">Lien créé</p>

          </div>



          <div className="flex min-w-0 items-center gap-2">

            <Input

              value={generatedLink}

              readOnly

              className="min-w-0 flex-1"

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



          <div className="h-px bg-[#e4edf6]" />



          <div className="space-y-3">

            <p className="text-sm font-semibold text-[#0b2f63]">Détails</p>

            <div className="flex justify-between text-sm">

              <span className="text-[#5c7188]">Montant</span>

              <span className="font-semibold tabular-nums text-[#0b2f63]">

                {formData.amount} {currency}

              </span>

            </div>

            <div className="flex justify-between gap-4 text-sm">

              <span className="shrink-0 text-[#5c7188]">Description</span>

              <span className="max-w-[200px] truncate text-[#0b2f63]">{formData.description}</span>

            </div>

            <div className="flex justify-between text-sm">

              <span className="text-[#5c7188]">Délai</span>

              <span className="text-[#0b2f63]">{formData.deliveryDays} jours</span>

            </div>

          </div>



          <Button variant="outline" className="w-full" onClick={resetForm}>

            Créer un autre lien

          </Button>

        </div>

      )}

    </div>

  );

};



export default CreatePaymentLink;


