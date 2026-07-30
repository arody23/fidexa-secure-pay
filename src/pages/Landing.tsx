import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Smartphone,
  Users,
  ArrowRight,
  CheckCircle,
  Play,
  Lock,
  Zap,
  TrendingUp,
  Globe,
  Star,
  Clock,
  Ban,
  HandCoins,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';
import SiteFooter from '@/components/layout/SiteFooter';
import { MVP_SUBSCRIPTION } from '@/config/site';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type LandingProvider = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
};

type ApprovedTestimonial = {
  id: string;
  content: string;
  rating: number;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
};

const FICTIONAL_TESTIMONIALS = [
  {
    id: 'f1',
    name: 'Awa K.',
    role: 'Graphiste · Abidjan',
    text: 'Avant, je livrais sans être payée. Avec FidexaPay, le client paie d’abord et je suis tranquille.',
    rating: 5,
  },
  {
    id: 'f2',
    name: 'Jean-Paul M.',
    role: 'Développeur · Kinshasa',
    text: 'Le Mobile Money + escrow m’a fait gagner des clients qui avaient peur de payer en avance.',
    rating: 5,
  },
  {
    id: 'f3',
    name: 'Fatou D.',
    role: 'Styliste · Cotonou',
    text: 'Simple à expliquer au client : il paie, je livre, les fonds sont libérés. Zéro stress.',
    rating: 5,
  },
  {
    id: 'f4',
    name: 'Ibrahim S.',
    role: 'Formateur · Bamako',
    text: 'J’ai arrêté les litiges interminables. FidexaPay joue vraiment le rôle de tiers de confiance.',
    rating: 4,
  },
  {
    id: 'f5',
    name: 'Grace N.',
    role: 'Consultante · Lomé',
    text: 'Créer un lien prend deux minutes. Mes clients paient sans créer de compte — parfait.',
    rating: 5,
  },
  {
    id: 'f6',
    name: 'Kevin O.',
    role: 'Photographe · Ouagadougou',
    text: 'La séquestration des fonds a changé ma façon de travailler. Je recommande à tous les freelances.',
    rating: 5,
  },
];

const FAQ = [
  {
    q: 'Le client doit-il créer un compte ?',
    a: 'Non. Il ouvre le lien, paie via Mobile Money, et suit la commande. Aucune inscription obligatoire côté acheteur.',
  },
  {
    q: 'Quand le prestataire reçoit-il l’argent ?',
    a: 'Après validation de la livraison (ou selon la procédure litige). Les fonds restent séquestrés jusque-là.',
  },
  {
    q: 'Quels moyens de paiement ?',
    a: 'Mobile Money via GeniusPay (Orange, MTN, Airtel, Wave…). La conversion devises est gérée au checkout.',
  },
  {
    q: 'Combien coûte FidexaPay ?',
    a: `Inscription gratuite. Commission ${MVP_SUBSCRIPTION.commission} % sur les transactions validées (plan Basique).`,
  },
];

function ProviderAvatar({
  name,
  avatarUrl,
  size = 'md',
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dim = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base';
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={name}
        className={cn(dim, 'rounded-full object-cover ring-2 ring-[hsl(var(--fidexa-navy))]', className)}
      />
    );
  }
  return (
    <div
      title={name}
      className={cn(
        dim,
        'flex items-center justify-center rounded-full bg-[hsl(var(--fidexa-green))] font-bold text-white ring-2 ring-[hsl(var(--fidexa-navy))]',
        className
      )}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-medium">{q}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Landing = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<LandingProvider[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<ApprovedTestimonial[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [{ data: prov }, { data: reviews }] = await Promise.all([
        supabase.rpc('get_landing_providers'),
        supabase.rpc('get_approved_testimonials'),
      ]);
      if (Array.isArray(prov)) setProviders(prov as LandingProvider[]);
      if (Array.isArray(reviews)) setApprovedReviews(reviews as ApprovedTestimonial[]);
    };
    void load();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setActiveStep((s) => (s + 1) % 4), 3500);
    return () => window.clearInterval(id);
  }, []);

  const providerCount = providers.length;
  const steps = [
    {
      n: '1',
      t: 'Créer',
      d: 'Lien de paiement personnalisé en moins de 2 minutes',
      detail: 'Montant, description, délai de livraison — un lien prêt à partager.',
    },
    {
      n: '2',
      t: 'Partager',
      d: 'WhatsApp, SMS, email ou réseaux',
      detail: 'Le client ouvre le lien sans créer de compte FidexaPay.',
    },
    {
      n: '3',
      t: 'Payer',
      d: 'Mobile Money → fonds en escrow',
      detail: 'Le paiement est sécurisé jusqu’à validation de la livraison.',
    },
    {
      n: '4',
      t: 'Valider',
      d: 'Client OK → fonds libérés',
      detail: 'Vous retirez ensuite vers votre Mobile Money (après KYC si requis).',
    },
  ];

  const marqueeItems = [
    ...FICTIONAL_TESTIMONIALS.map((t) => ({
      key: t.id,
      name: t.name,
      subtitle: t.role,
      text: t.text,
      rating: t.rating,
      avatar: null as string | null,
    })),
    ...approvedReviews.map((t) => ({
      key: t.id,
      name: t.full_name || 'Prestataire',
      subtitle: t.country || 'FidexaPay',
      text: t.content,
      rating: t.rating,
      avatar: t.avatar_url,
    })),
  ];
  const marqueeLoop = [...marqueeItems, ...marqueeItems];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#mission" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Mission
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Processus
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Avis
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Tarifs
            </a>
            <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button size="sm" asChild>
                <Link to="/dashboard">Mon espace</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth/signin">Connexion</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth/signup">Commencer</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--fidexa-navy))] pb-16 pt-24 text-white lg:pb-24 lg:pt-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 20%, hsl(152 62% 44% / 0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, hsl(213 58% 35% / 0.8), transparent 50%)',
          }}
        />
        <div className="container relative mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[hsl(var(--fidexa-green-light))]"
              >
                FidexaPay
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="mb-5 font-serif text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Payer et livrer en toute sérénité
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="mb-8 max-w-xl text-base leading-relaxed text-white/80 md:text-lg"
              >
                Escrow + Mobile Money : le client paie en sécurité, les fonds sont séquestrés, le prestataire est payé
                après validation de la livraison — sans compte client obligatoire.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-8 flex flex-col gap-3 sm:flex-row"
              >
                <Button
                  size="lg"
                  className="h-12 bg-[hsl(var(--fidexa-green))] px-8 text-white hover:bg-[hsl(var(--fidexa-green-dark))]"
                  asChild
                >
                  <Link to="/auth/signup">
                    Créer mon compte gratuit
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/30 bg-transparent px-8 text-white hover:bg-white/10"
                  asChild
                >
                  <a href="#how-it-works">
                    <Play className="mr-2 h-4 w-4" /> Voir comment ça marche
                  </a>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Pays couverts</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { flag: '🇧🇯', name: 'Bénin' },
                      { flag: '🇧🇫', name: 'Burkina' },
                      { flag: '🇨🇮', name: "Côte d'Ivoire" },
                      { flag: '🇨🇩', name: 'RD Congo' },
                      { flag: '🇨🇬', name: 'Congo' },
                      { flag: '🇲🇱', name: 'Mali' },
                      { flag: '🇹🇬', name: 'Togo' },
                    ].map((c) => (
                      <span
                        key={c.name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/90"
                      >
                        <span className="text-base leading-none">{c.flag}</span>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compteur prestataires — pas de photos individuelles */}
                <div className="flex flex-wrap items-center gap-3">
                  {providerCount > 0 ? (
                    <p className="text-sm text-white/75">
                      <span className="font-semibold text-white">
                        {providerCount} prestataire{providerCount > 1 ? 's' : ''}
                      </span>{' '}
                      nous font confiance
                    </p>
                  ) : (
                    <p className="text-sm text-white/70">
                      Soyez le prochain prestataire à sécuriser vos paiements.
                    </p>
                  )}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:p-6">
                <p className="mb-4 text-sm font-medium text-white/70">Comment FidexaPay protège vos paiements</p>
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { step: '1', title: 'Paiement', desc: 'Mobile Money' },
                    { step: '2', title: 'Escrow', desc: 'Fonds bloqués' },
                    { step: '3', title: 'Libération', desc: 'Après validation' },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="rounded-xl bg-[hsl(var(--fidexa-navy-dark))]/60 p-3 text-center transition hover:bg-[hsl(var(--fidexa-navy-dark))]"
                    >
                      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--fidexa-green))] text-sm font-bold">
                        {s.step}
                      </div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-white/55">{s.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-3">
                    <p className="text-xs font-semibold text-red-200">Sans FidexaPay</p>
                    <p className="mt-1 text-xs text-white/65">
                      Litiges, non-paiement, perte de temps et de confiance.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[hsl(var(--fidexa-green))]/30 bg-[hsl(var(--fidexa-green))]/10 p-3">
                    <p className="text-xs font-semibold text-[hsl(var(--fidexa-green-light))]">Avec FidexaPay</p>
                    <p className="mt-1 text-xs text-white/65">
                      Paiement protégé, livraison validée, fonds libérés.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:gap-8 md:py-12">
          {[
            { icon: Shield, label: 'Escrow sécurisé', value: '100 %' },
            { icon: Clock, label: 'Créer un lien', value: '2 min' },
            { icon: HandCoins, label: 'Inscription', value: '0 frais' },
            {
              icon: Users,
              label: 'Prestataires',
              value: providerCount > 0 ? String(providerCount) : '—',
            },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <s.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-primary md:text-3xl">{s.value}</p>
              <p className="text-xs text-muted-foreground md:text-sm">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="bg-muted/30 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Pourquoi FidexaPay est indispensable</h2>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                En Afrique, la confiance bloque les ventes en ligne : le client craint de payer sans recevoir, le
                prestataire craint de livrer sans être payé. FidexaPay résout ce dilemme avec un tiers de confiance —
                l&apos;escrow + Mobile Money.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Lock, text: "Fonds bloqués jusqu'à validation client" },
                  { icon: Smartphone, text: 'Mobile Money local (Orange, MTN, Airtel, Wave…)' },
                  { icon: Users, text: 'Client paie sans créer de compte' },
                  { icon: TrendingUp, text: 'Solde, retraits et KYC pour le prestataire' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Réseaux Mobile Money acceptés</p>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { name: 'Orange Money', color: 'bg-orange-500' },
                    { name: 'MTN Money', color: 'bg-yellow-500' },
                    { name: 'Airtel Money', color: 'bg-red-500' },
                    { name: 'Wave', color: 'bg-blue-500' },
                    { name: 'Moov Money', color: 'bg-blue-700' },
                    { name: 'M-Pesa', color: 'bg-green-600' },
                  ].map((m) => (
                    <span
                      key={m.name}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white',
                        m.color
                      )}
                    >
                      <Smartphone className="h-3 w-3" />
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: Shield, title: 'Escrow', desc: 'Protection bilatérale des fonds' },
                { icon: Zap, title: 'Rapide', desc: 'Lien prêt en 30 secondes' },
                { icon: Smartphone, title: 'Mobile first', desc: 'Pensé pour le téléphone' },
                { icon: CheckCircle, title: 'Transparent', desc: 'Suivi commande en direct' },
              ].map((item, i) => (
                <Card
                  key={i}
                  className="border-border/50 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <item.icon className="mb-3 h-8 w-8 text-primary" />
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Douleurs */}
      <section className="border-y border-border py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-3 text-3xl font-bold">Ce que vous perdez sans escrow</h2>
            <p className="text-muted-foreground">
              Chaque jour sans protection, c’est du temps, de l’argent et de la confiance en moins.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              {
                icon: Ban,
                title: 'Non-paiement',
                text: 'Vous livrez, le client disparaît. Sans séquestration, difficile de récupérer les fonds.',
              },
              {
                icon: Clock,
                title: 'Temps perdu',
                text: 'Relances, preuves, disputes WhatsApp… des heures perdues au lieu de produire.',
              },
              {
                icon: MessageCircle,
                title: 'Confiance cassée',
                text: 'Le client hésite à payer d’avance. Sans tiers de confiance, la vente n’aboutit pas.',
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-6 transition hover:border-destructive/30"
              >
                <item.icon className="mb-4 h-8 w-8 text-destructive" />
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — interactif */}
      <section id="how-it-works" className="bg-secondary/20 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">Le parcours en 4 étapes</h2>
            <p className="text-muted-foreground">Cliquez une étape pour voir le détail</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-4">
            {steps.map((step, i) => (
              <button
                key={step.n}
                type="button"
                onClick={() => setActiveStep(i)}
                className={cn(
                  'rounded-2xl border p-5 text-left transition',
                  activeStep === i
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <div
                  className={cn(
                    'mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold',
                    activeStep === i ? 'bg-white/20' : 'bg-primary text-primary-foreground'
                  )}
                >
                  {step.n}
                </div>
                <h3 className="font-semibold">{step.t}</h3>
                <p className={cn('mt-1 text-sm', activeStep === i ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {step.d}
                </p>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto mt-8 max-w-5xl rounded-2xl border border-border bg-card p-6 md:p-8"
            >
              <p className="text-sm font-semibold text-primary">Étape {steps[activeStep].n}</p>
              <h3 className="mt-1 text-xl font-bold">{steps[activeStep].t}</h3>
              <p className="mt-2 max-w-2xl text-muted-foreground">{steps[activeStep].detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Témoignages marquee */}
      <section id="testimonials" className="overflow-hidden border-t border-border bg-muted/20 py-16 lg:py-20">
        <div className="container mx-auto mb-8 px-4 text-center">
          <h2 className="mb-2 text-3xl font-bold">Ils nous font confiance</h2>
          <p className="text-muted-foreground">
            Témoignages — les avis réels des prestataires apparaissent après validation admin
          </p>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent md:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent md:w-24" />
          <div className="fidexa-marquee flex w-max gap-4 py-2">
            {marqueeLoop.map((t, idx) => (
              <article
                key={`${t.key}-${idx}`}
                className="w-[300px] shrink-0 rounded-xl border border-border bg-card p-5 shadow-sm sm:w-[340px]"
              >
                <div className="mb-3 flex items-center gap-3">
                  <ProviderAvatar name={t.name} avatarUrl={t.avatar} size="sm" className="ring-border" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.subtitle}</p>
                  </div>
                </div>
                <div className="mb-2 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">Abonnements</h2>
            <p className="text-muted-foreground">Choisissez le plan qui convient à votre activité</p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-md"
          >
            <Card className="overflow-hidden border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommandé</p>
                <h3 className="mt-1 text-2xl font-bold">{MVP_SUBSCRIPTION.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{MVP_SUBSCRIPTION.description}</p>
                <p className="mt-4 text-4xl font-bold">Gratuit</p>
                <p className="text-sm text-muted-foreground">Pour toujours</p>
                <div className="my-6 rounded-lg bg-muted p-3 text-center">
                  <p className="text-sm text-muted-foreground">Commission</p>
                  <p className="text-2xl font-bold text-primary">{MVP_SUBSCRIPTION.commission} %</p>
                </div>
                <ul className="mb-8 space-y-3">
                  {MVP_SUBSCRIPTION.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" asChild>
                  <Link to="/auth/signup">Commencer gratuitement</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-muted/30 py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="mb-2 text-center text-3xl font-bold">Questions fréquentes</h2>
          <p className="mb-8 text-center text-muted-foreground">Les réponses essentielles avant de démarrer</p>
          <div className="rounded-2xl border border-border bg-card px-5">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[hsl(var(--fidexa-navy))] py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Rejoignez les prestataires qui sécurisent leurs ventes
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-white/70">
              Inscription gratuite · Mobile Money · Escrow · Support dédié
            </p>
            <Button
              size="lg"
              className="bg-[hsl(var(--fidexa-green))] text-white hover:bg-[hsl(var(--fidexa-green-dark))]"
              asChild
            >
              <Link to="/auth/signup">
                Créer mon compte <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Landing;
