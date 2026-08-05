import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MessageCircle,
  Package,
  Receipt,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import Logo from '@/components/Logo';

const dashboardNav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, active: true },
  { label: 'Créer un lien', icon: Link2 },
  { label: 'Commandes actives', icon: Package },
  { label: 'Transactions', icon: Receipt },
  { label: 'Retraits', icon: Wallet },
];

function BrowserDashboard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#cbd9e8] bg-white shadow-[0_28px_80px_rgba(11,47,99,.15)]">
      <div className="flex h-10 items-center gap-2 border-b border-[#dfe8f2] bg-[#f8fafc] px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#2bb673]" />
        <span className="ml-3 rounded-md bg-white px-4 py-1 text-[10px] text-[#6b7f93] shadow-sm">
          app.fidexapay.com/dashboard
        </span>
      </div>
      <div className="grid min-h-[430px] grid-cols-[180px_1fr] bg-[#f6f9fd] sm:grid-cols-[220px_1fr]">
        <aside className="border-r border-[#dbe6f2] bg-white p-3 sm:p-4">
          <Logo size="sm" className="mb-6" />
          <nav className="space-y-1">
            {dashboardNav.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] font-medium sm:text-xs ${
                  item.active ? 'bg-[#0b3b78] text-white' : 'text-[#5c7188]'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-tight text-[#132f52] sm:text-2xl">Tableau de bord</p>
              <p className="text-[10px] text-[#6b7f93] sm:text-xs">Aperçu de votre activité</p>
            </div>
            <span className="rounded-lg bg-[#0b3b78] px-3 py-2 text-[10px] font-semibold text-white sm:text-xs">
              + Créer un lien
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_.6fr]">
            <div className="flex min-h-32 flex-col justify-between rounded-xl bg-[#0b3b78] p-4 text-white">
              <div>
                <p className="text-[10px] text-white/70 sm:text-xs">Fonds libérés ce mois</p>
                <p className="mt-2 text-xl font-semibold sm:text-3xl">1 240 000 CDF</p>
              </div>
              <p className="border-t border-white/15 pt-3 text-[9px] text-white/65 sm:text-[11px]">
                Net de commission · Voir les transactions
              </p>
            </div>
            <div className="flex min-h-32 flex-col justify-between rounded-xl border border-[#cfe9da] bg-[#eff8f3] p-4">
              <Wallet className="h-5 w-5 text-[#178c52]" />
              <div>
                <p className="text-[10px] text-[#56736a]">Solde disponible</p>
                <p className="mt-1 text-sm font-semibold text-[#0b3b78] sm:text-base">Retrait Mobile Money</p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['3', 'À livrer'],
              ['18', 'Validées'],
              ['1', 'Annulée'],
              ['0', 'Litige'],
            ].map(([value, label], index) => (
              <div key={label} className="rounded-xl border border-[#dce7f3] bg-white p-3">
                <div className={`mb-4 h-6 w-6 rounded-md ${index === 0 ? 'bg-[#fff6e8]' : 'bg-[#edf9f2]'}`} />
                <p className="text-lg font-semibold text-[#0b2f63]">{value}</p>
                <p className="text-[9px] text-[#5b738c] sm:text-[10px]">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-[#dce7f3] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#132f52] sm:text-sm">Opérations récentes</p>
              <span className="text-[9px] text-[#1354b8] sm:text-[10px]">Voir tout</span>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ['Création logo entreprise', 'Payée · 420 000 CDF'],
                ['Site vitrine', 'En livraison · 680 000 CDF'],
              ].map(([title, meta]) => (
                <div key={title} className="flex items-center justify-between rounded-lg bg-[#f7faff] px-3 py-2">
                  <p className="text-[9px] font-medium text-[#183a60] sm:text-[11px]">{title}</p>
                  <p className="text-[8px] text-[#66809a] sm:text-[10px]">{meta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({
  step,
  title,
  caption,
  children,
}: {
  step: string;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <article className="w-[226px] shrink-0 snap-center">
      <div className="relative mx-auto h-[474px] overflow-hidden rounded-[2.25rem] border-[7px] border-[#102946] bg-[#f7f9fc] shadow-[0_22px_55px_rgba(11,47,99,.16)]">
        <div className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#102946]" />
        <div className="h-full overflow-hidden pt-5">{children}</div>
      </div>
      <div className="mt-5 flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b3b78] text-xs font-semibold text-white">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-[#0b2f63]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#617a93]">{caption}</p>
        </div>
      </div>
    </article>
  );
}

function PaymentScreen() {
  return (
    <div className="h-full bg-[#f7f9fc] px-4 py-5">
      <Logo size="sm" />
      <div className="mt-5 rounded-xl border border-[#dce7f3] bg-white p-4">
        <p className="text-xs font-semibold text-[#183a60]">Détails du paiement</p>
        <div className="mt-3 rounded-xl bg-[#f1f5f9] p-4 text-center">
          <p className="text-[10px] text-[#6b7f93]">Montant à payer</p>
          <p className="mt-1 text-2xl font-semibold text-[#102f55]">120 000 CDF</p>
        </div>
        <div className="mt-3 flex justify-between text-[10px]">
          <span className="text-[#71859a]">Service</span>
          <span className="font-medium text-[#183a60]">Création d&apos;un logo</span>
        </div>
        <div className="mt-3 rounded-lg border border-[#b9d4f1] bg-[#eef6ff] p-3">
          <div className="flex gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#1354b8]" />
            <p className="text-[9px] leading-relaxed text-[#4c6680]">Les fonds restent protégés jusqu&apos;à votre validation.</p>
          </div>
        </div>
        <label className="mt-4 block text-[10px] font-medium text-[#183a60]">Numéro Mobile Money</label>
        <div className="mt-1 rounded-lg border border-[#d5e0eb] px-3 py-2 text-[10px] text-[#71859a]">+243 8XX XXX XXX</div>
        <label className="mt-3 block text-[10px] font-medium text-[#183a60]">Numéro WhatsApp de suivi</label>
        <div className="mt-1 rounded-lg border border-[#d5e0eb] px-3 py-2 text-[10px] text-[#71859a]">+243 9XX XXX XXX</div>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-[#0b3b78] py-3 text-center text-xs font-semibold text-white">
        Payer en sécurité
      </div>
    </div>
  );
}

function UssdScreen() {
  return (
    <div className="flex h-full flex-col bg-[#e9edf2]">
      <div className="flex items-center justify-between px-5 py-3 text-[9px] font-medium text-[#1d2939]">
        <span>10:24</span><span>4G · 86%</span>
      </div>
      <div className="flex flex-1 items-center px-4">
        <div className="w-full rounded-2xl bg-white p-5 shadow-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff4cc]">
            <Smartphone className="h-5 w-5 text-[#8a6400]" />
          </div>
          <p className="mt-4 text-sm font-semibold text-[#182230]">Demande Mobile Money</p>
          <p className="mt-2 text-[11px] leading-relaxed text-[#59697b]">
            Confirmez le paiement de <strong>120 000 CDF</strong> pour FidexaPay avec votre code secret.
          </p>
          <div className="mt-4 rounded-lg border border-[#d6dee8] px-3 py-2.5 text-[11px] text-[#8a98a8]">Code secret</div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#edf1f5] py-2.5 text-center text-[10px] font-medium text-[#516273]">Annuler</div>
            <div className="rounded-lg bg-[#ffcc00] py-2.5 text-center text-[10px] font-semibold text-[#231f00]">Confirmer</div>
          </div>
        </div>
      </div>
      <p className="px-6 pb-7 text-center text-[9px] leading-relaxed text-[#718096]">Fenêtre sécurisée affichée par l&apos;opérateur Mobile Money.</p>
    </div>
  );
}

function WhatsAppScreen() {
  return (
    <div className="h-full bg-[#e8e1d8]">
      <div className="bg-[#075e54] px-4 pb-3 pt-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
            <img src="/assets/logo/fidexapay-mark.png" alt="" className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold">FidexaPay</p>
            <p className="text-[9px] text-white/70">Compte professionnel</p>
          </div>
        </div>
      </div>
      <div className="p-4 pt-16">
        <div className="max-w-[92%] rounded-xl rounded-tl-none bg-white p-3 shadow-sm">
          <p className="text-[10px] leading-relaxed text-[#283b3a]">
            FidexaPay — votre code d&apos;accès au suivi de commande est <strong>482 731</strong>.
            Valable 15 minutes. Ne le partagez avec personne.
          </p>
          <p className="mt-1 text-right text-[8px] text-[#869895]">10:26 ✓✓</p>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-4 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-[9px] text-[#879594]">
        <MessageCircle className="h-4 w-4" /> Message
      </div>
    </div>
  );
}

function OtpScreen() {
  return (
    <div className="h-full bg-[#f3f6f9] px-4 py-8">
      <div className="flex justify-center"><Logo size="sm" /></div>
      <div className="mt-8 rounded-xl border border-[#dce5ee] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-5 w-5 text-[#1354b8]" />
          <p className="text-sm font-semibold text-[#183a60]">Vérification sécurisée</p>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[#6b7f93]">
          Entrez le code OTP envoyé sur WhatsApp (+243 9•• ••• •79).
        </p>
        <div className="mt-5 flex justify-between gap-1.5">
          {'482731'.split('').map((digit, index) => (
            <span key={`${digit}-${index}`} className="flex h-9 w-8 items-center justify-center rounded-lg border border-[#bfd0e3] text-xs font-semibold text-[#183a60]">
              {digit}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-[#0b3b78] py-3 text-center text-[10px] font-semibold text-white">Vérifier et accéder</div>
        <p className="mt-4 text-center text-[9px] text-[#71859a]">Renvoyer le code</p>
      </div>
    </div>
  );
}

function TrackingScreen() {
  return (
    <div className="h-full bg-[#f7f9fc] px-4 py-6">
      <Logo size="sm" />
      <div className="mt-5 rounded-xl border border-[#dce7f3] bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] text-[#71859a]">Commande</p>
            <p className="text-sm font-semibold text-[#183a60]">Création d&apos;un logo</p>
          </div>
          <span className="rounded-full bg-[#fff3d8] px-2 py-1 text-[8px] font-medium text-[#8a6200]">À valider</span>
        </div>
        <div className="mt-4 rounded-lg bg-[#edf9f2] p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#178c52]" />
            <p className="text-[10px] font-semibold text-[#245c43]">Travail terminé</p>
          </div>
          <p className="mt-1 text-[9px] text-[#56736a]">Le prestataire attend votre validation.</p>
        </div>
        <div className="mt-5 space-y-4">
          {[
            ['Paiement effectué', 'Fonds sécurisés en escrow', true],
            ['Travail démarré', 'Prestation en cours', true],
            ['Travail terminé', 'En attente de votre validation', true],
            ['Fonds libérés', 'Après votre confirmation', false],
          ].map(([title, text, done]) => (
            <div key={String(title)} className="flex gap-3">
              <span className={`mt-0.5 h-4 w-4 rounded-full border-2 ${done ? 'border-[#2bb673] bg-[#2bb673]' : 'border-[#c6d3df]'}`} />
              <div>
                <p className="text-[10px] font-medium text-[#183a60]">{title}</p>
                <p className="text-[8px] text-[#71859a]">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg bg-[#2bb673] py-3 text-center text-[10px] font-semibold text-white">
          Valider la livraison
        </div>
        <div className="mt-2 rounded-lg border border-[#d3dfe9] py-2.5 text-center text-[9px] font-medium text-[#526b83]">
          Signaler un problème
        </div>
      </div>
    </div>
  );
}

export function LandingProductJourneySection() {
  return (
    <section id="product-journey" className="overflow-hidden bg-[#eef5ff] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#178c52]">Le produit, réellement</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
            Chaque étape reste visible et contrôlée.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#526d87] sm:text-lg">
            Le prestataire pilote ses ventes depuis son tableau de bord. Le client paie sans créer de compte,
            reçoit son accès sécurisé et valide la livraison depuis son téléphone.
          </p>
        </div>

        <div className="mt-14">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#0b2f63]">Espace prestataire</p>
              <p className="text-xs text-[#6b7f93]">Interface FidexaPay avec données de démonstration</p>
            </div>
            <span className="hidden items-center gap-2 text-xs font-medium text-[#178c52] sm:flex">
              <ShieldCheck className="h-4 w-4" /> Fonds et commandes en un seul endroit
            </span>
          </div>
          <BrowserDashboard />
        </div>

        <div className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-[#0b2f63]">Parcours client sur mobile</p>
            <p className="mt-2 text-sm leading-relaxed text-[#617a93]">
              Les écrans FidexaPay sont distingués des fenêtres externes de l&apos;opérateur et de WhatsApp.
            </p>
          </div>
          <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-8 [scrollbar-width:thin] xl:grid xl:grid-cols-5 xl:overflow-visible">
            <PhoneFrame step="1" title="Paiement sécurisé" caption="Le client vérifie le service, les montants et ses numéros.">
              <PaymentScreen />
            </PhoneFrame>
            <PhoneFrame step="2" title="Validation Mobile Money" caption="L’opérateur affiche la demande USSD sécurisée.">
              <UssdScreen />
            </PhoneFrame>
            <PhoneFrame step="3" title="Code reçu sur WhatsApp" caption="Le code OTP protège l’accès au suivi de la commande.">
              <WhatsAppScreen />
            </PhoneFrame>
            <PhoneFrame step="4" title="Accès au suivi" caption="Le client saisit son code une seule fois sur son appareil.">
              <OtpScreen />
            </PhoneFrame>
            <PhoneFrame step="5" title="Livraison validée" caption="Après vérification, le client libère les fonds au prestataire.">
              <TrackingScreen />
            </PhoneFrame>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#6b7f93]">
            <Clock3 className="h-4 w-4 text-[#178c52]" />
            Le client peut aussi ouvrir un litige avant la libération des fonds.
          </p>
        </div>

        <div className="mx-auto mt-16 flex max-w-2xl flex-col items-center rounded-2xl bg-[#0b3b78] px-6 py-8 text-center text-white sm:px-10">
          <p className="text-xl font-semibold sm:text-2xl">Vous créez le lien. Votre client suit le parcours.</p>
          <a href="/auth/signup" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2bb673] px-5 py-3 text-sm font-semibold text-white">
            Créer mon compte prestataire <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
