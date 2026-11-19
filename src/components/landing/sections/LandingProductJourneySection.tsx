import {
  ArrowRight,
  Clock3,
  LayoutDashboard,
  Link2,
  Package,
  PlayCircle,
  Plus,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import Logo from '@/components/Logo';

/** Navigation réelle du DashboardLayout */
const dashboardNav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, active: true },
  { label: 'Créer un lien', icon: Link2 },
  { label: 'Tous mes liens', icon: Package },
  { label: 'Commandes actives', icon: PlayCircle },
  { label: 'Retraits', icon: Wallet },
  { label: 'Transactions', icon: Receipt },
];

function BrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#cbd9e8] bg-white shadow-[0_28px_80px_rgba(11,47,99,.15)]">
      <div className="flex h-10 items-center gap-2 border-b border-[#dfe8f2] bg-[#f8fafc] px-3 sm:px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#2bb673]" />
        <span className="ml-2 truncate rounded-md bg-white px-2 py-1 text-[10px] text-[#6b7f93] shadow-sm sm:ml-3 sm:px-4">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Miroir du vrai Dashboard.tsx */
function RealDashboardPreview() {
  return (
    <BrowserChrome url="app.fidexapay.com/dashboard">
      <div className="grid min-h-0 bg-[#f6f9fd] md:min-h-[440px] md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-[#dbe6f2] bg-white p-3 md:block">
          <Logo size="sm" className="mb-5" to="/dashboard" />
          <nav className="space-y-1">
            {dashboardNav.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-medium ${
                  item.active ? 'bg-[#0b3b78] text-white' : 'text-[#5c7188]'
                }`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
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
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#0b3b78] px-2.5 py-2 text-[10px] font-semibold text-white sm:text-xs">
              <Plus className="h-3 w-3" /> Créer un lien
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1.45fr_.55fr]">
            <div className="flex min-h-28 flex-col justify-between rounded-2xl bg-[#0b3b78] p-4 text-white sm:min-h-32">
              <div>
                <p className="text-[10px] text-white/70">Fonds libérés ce mois</p>
                <p className="mt-2 text-xl font-semibold sm:text-3xl">1 240 000 CDF</p>
              </div>
              <p className="border-t border-white/15 pt-3 text-[9px] text-white/65 sm:text-[11px]">
                Net de commission · Voir les transactions
              </p>
            </div>
            <div className="flex min-h-28 flex-col justify-between rounded-2xl border border-[#cfe9da] bg-[#eff8f3] p-4 sm:min-h-32">
              <Wallet className="h-5 w-5 text-[#178c52]" />
              <div>
                <p className="text-[10px] text-[#56736a]">Retraits prestataire</p>
                <p className="mt-1 text-sm font-semibold text-[#0b3b78]">Solde disponible</p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['3', 'À livrer'],
              ['18', 'Validées'],
              ['1', 'Annulées'],
              ['0', 'Litiges'],
            ].map(([value, label], index) => (
              <div key={label} className="rounded-xl p-3">
                <div className={`mb-3 h-8 w-8 rounded-xl ${index === 0 ? 'bg-[#fff6e8]' : 'bg-[#edf9f2]'}`} />
                <p className="text-lg font-semibold text-[#0b2f63]">{value}</p>
                <p className="text-[9px] text-[#5b738c]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#132f52]">Liens de paiement récents</p>
              <span className="text-[9px] text-[#1354b8]">Voir tout</span>
            </div>
            <div className="mt-2 divide-y divide-[#e4edf6]">
              {[
                ['Client Logo Corp', 'pay_1739…a2f', '420 000 CDF', 'Payé'],
                ['Site vitrine PME', 'pay_1738…91c', '680 000 CDF', 'À livrer'],
              ].map(([name, id, amount, status]) => (
                <div key={id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-[#183a60]">{name}</p>
                    <p className="truncate text-[9px] text-[#7a90a5]">{id}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-[#0b2f63]">{amount}</p>
                    <p className="text-[9px] text-[#178c52]">{status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

/** Miroir de CreatePaymentLink.tsx */
function CreateLinkPreview() {
  return (
    <BrowserChrome url="app.fidexapay.com/dashboard/create-link">
      <div className="bg-[#f6f9fd] p-4 sm:p-6">
        <div className="mx-auto max-w-xl rounded-xl border border-[#dce7f3] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[#0b3b78]" />
            <p className="text-sm font-semibold text-[#0b2f63]">Nouveau lien de paiement</p>
          </div>
          <p className="mt-1 text-[11px] text-[#6b7f93]">Remplissez les informations pour créer votre lien.</p>

          <div className="mt-5 space-y-3">
            <div>
              <p className="text-[10px] font-medium text-[#3d566f]">Montant (CDF)</p>
              <div className="mt-1 rounded-lg border border-[#d5e0eb] px-3 py-2 text-sm font-semibold text-[#0b2f63]">
                120 000
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[#3d566f]">Description du service</p>
              <div className="mt-1 rounded-lg border border-[#d5e0eb] px-3 py-2 text-[11px] text-[#516273]">
                Création d&apos;un logo entreprise — 2 propositions + fichiers sources
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[#3d566f]">Délai de livraison (jours)</p>
              <div className="mt-1 rounded-lg border border-[#d5e0eb] px-3 py-2 text-[11px] text-[#0b2f63]">7</div>
            </div>
            <div className="rounded-lg border border-[#e4edf6] bg-[#f7faff] p-3">
              <p className="text-[10px] font-medium text-[#3d566f]">Informations client (optionnel)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-[#d5e0eb] bg-white px-2.5 py-2 text-[10px] text-[#71859a]">
                  Nom · Amina K.
                </div>
                <div className="rounded-md border border-[#d5e0eb] bg-white px-2.5 py-2 text-[10px] text-[#71859a]">
                  +243 · 8XX XXX XXX
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-[#0b3b78] py-3 text-center text-xs font-semibold text-white">
              Créer le lien sécurisé
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function PhoneFrame({
  step,
  title,
  caption,
  screenshotSrc,
  children,
}: {
  step: string;
  title: string;
  caption: string;
  /** Capture réelle 390×844 — remplit exactement la zone écran du mockup */
  screenshotSrc?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="w-[min(226px,78vw)] shrink-0 snap-center">
      <div className="relative mx-auto aspect-[9/19] max-h-[474px] w-full overflow-hidden rounded-[2rem] border-[6px] border-[#102946] bg-[#0b1220] shadow-[0_22px_55px_rgba(11,47,99,.16)] sm:rounded-[2.25rem] sm:border-[7px]">
        <div className="absolute left-1/2 top-0 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[#102946]" />
        <div className="relative h-full overflow-hidden pt-5">
          {screenshotSrc ? (
            <img
              src={screenshotSrc}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover object-top"
              loading="lazy"
              width={390}
              height={844}
            />
          ) : (
            children
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-3 sm:mt-5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b3b78] text-xs font-semibold text-white">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#0b2f63]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#617a93]">{caption}</p>
        </div>
      </div>
    </article>
  );
}

const CLIENT_JOURNEY_SHOTS = [
  {
    step: '1',
    title: 'Paiement sécurisé',
    caption: 'Le client vérifie le service et paie via Mobile Money.',
    src: '/assets/landing/journey/step-01-payment.png',
  },
  {
    step: '2',
    title: 'Validation Mobile Money',
    caption: 'L’opérateur affiche la demande USSD sécurisée.',
    src: '/assets/landing/journey/step-02-ussd.png',
  },
  {
    step: '3',
    title: 'Code reçu sur WhatsApp',
    caption: 'Le code OTP protège l’accès au suivi.',
    src: '/assets/landing/journey/step-03-whatsapp.png',
  },
  {
    step: '4',
    title: 'Accès au suivi',
    caption: 'Le client saisit son code une seule fois.',
    src: '/assets/landing/journey/step-04-otp.png',
  },
  {
    step: '5',
    title: 'Livraison validée',
    caption: 'Après vérification, les fonds sont libérés.',
    src: '/assets/landing/journey/step-05-tracking.png',
  },
] as const;

export function LandingProductJourneySection() {
  return (
    <section id="product-journey" className="overflow-x-clip bg-[#eef5ff] py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#178c52]">Le produit, réellement</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b2f63] sm:text-5xl">
            Les écrans FidexaPay, tels qu&apos;ils sont.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#526d87] sm:text-lg">
            Aperçus fidèles du tableau de bord prestataire, de la création de lien, et du parcours client
            jusqu&apos;à la validation.
          </p>
        </div>

        <div className="mt-10 sm:mt-14">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0b2f63]">Espace prestataire</p>
              <p className="text-xs text-[#6b7f93]">Tableau de bord réel FidexaPay</p>
            </div>
            <span className="hidden items-center gap-2 text-xs font-medium text-[#178c52] sm:flex">
              <ShieldCheck className="h-4 w-4" /> Fonds et commandes en un seul endroit
            </span>
          </div>
          <RealDashboardPreview />
        </div>

        <div className="mt-10 sm:mt-14">
          <div className="mb-5">
            <p className="text-sm font-semibold text-[#0b2f63]">Création d&apos;un lien de paiement</p>
            <p className="text-xs text-[#6b7f93]">Formulaire réel utilisé dans l&apos;application</p>
          </div>
          <CreateLinkPreview />
        </div>

        <div className="mt-14 sm:mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-[#0b2f63]">Parcours client sur mobile</p>
            <p className="mt-2 text-sm leading-relaxed text-[#617a93]">
              Paiement, confirmation opérateur, OTP WhatsApp, puis validation de livraison.
            </p>
            <p className="mt-2 text-xs text-[#8aa0b5] sm:hidden">Faites glisser pour voir chaque étape →</p>
          </div>
          <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-8 [scrollbar-width:thin] sm:mx-0 sm:mt-10 sm:px-0 xl:grid xl:grid-cols-5 xl:overflow-visible">
            {CLIENT_JOURNEY_SHOTS.map((shot) => (
              <PhoneFrame
                key={shot.step}
                step={shot.step}
                title={shot.title}
                caption={shot.caption}
                screenshotSrc={shot.src}
              />
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#6b7f93]">
            <Clock3 className="h-4 w-4 shrink-0 text-[#178c52]" />
            Le client peut ouvrir un litige avant la libération des fonds.
          </p>
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col items-center rounded-2xl bg-[#0b3b78] px-5 py-8 text-center text-white sm:mt-16 sm:px-10">
          <p className="text-xl font-semibold sm:text-2xl">Vous créez le lien. Votre client suit le parcours.</p>
          <a
            href="/auth/signup"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2bb673] px-5 py-3 text-sm font-semibold text-white"
          >
            Créer mon compte prestataire <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
