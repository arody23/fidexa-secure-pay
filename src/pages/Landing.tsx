import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';
import SiteFooter from '@/components/layout/SiteFooter';
import { MVP_SUBSCRIPTION } from '@/config/site';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

function ProviderAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base';
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${dim} rounded-full object-cover ring-2 ring-white/20`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full bg-[hsl(var(--fidexa-green))] font-bold text-white ring-2 ring-white/20`}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

const Landing = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<LandingProvider[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<ApprovedTestimonial[]>([]);

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

  const providerCount = providers.length;
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
  // Double for seamless marquee
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
            <a href="#demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Démo
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Avis
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Processus
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Tarifs
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
                className="mb-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
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
                  <a href="#demo">
                    <Play className="mr-2 h-4 w-4" /> Voir la démo
                  </a>
                </Button>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}>
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
              </motion.div>
            </div>

            {/* Vrais prestataires */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="relative"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:p-6">
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white/70">Nos prestataires</p>
                    <p className="mt-1 text-2xl font-bold">
                      {providerCount > 0 ? (
                        <>
                          {providerCount} compte{providerCount > 1 ? 's' : ''}
                        </>
                      ) : (
                        'Rejoignez-nous'
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-white/50">Profils réels</p>
                </div>

                {providerCount === 0 ? (
                  <div className="rounded-xl bg-[hsl(var(--fidexa-navy-dark))]/50 p-6 text-center">
                    <Users className="mx-auto mb-3 h-8 w-8 text-[hsl(var(--fidexa-green-light))]" />
                    <p className="text-sm text-white/75">
                      Soyez parmi les premiers prestataires à encaisser en escrow + Mobile Money.
                    </p>
                    <Button className="mt-4 bg-[hsl(var(--fidexa-green))] hover:bg-[hsl(var(--fidexa-green-dark))]" asChild>
                      <Link to="/auth/signup">Créer mon compte</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                    {providers.map((p) => {
                      const name = p.full_name || 'Prestataire';
                      return (
                        <div
                          key={p.id}
                          className="flex items-start gap-3 rounded-xl bg-[hsl(var(--fidexa-navy-dark))]/55 p-3"
                        >
                          <ProviderAvatar name={name} avatarUrl={p.avatar_url} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{name}</p>
                            {p.country && <p className="text-xs text-white/50">{p.country}</p>}
                            {p.bio?.trim() && (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/65">
                                {p.bio.trim()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
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

      {/* Mission */}
      <section id="mission" className="border-y border-border bg-muted/30 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Pourquoi FidexaPay est indispensable</h2>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                En Afrique, la confiance bloque les ventes en ligne : le client craint de payer sans recevoir, le
                prestataire craint de livrer sans être payé. FidexaPay résout ce dilemme avec un tiers de confiance —
                l&apos;escrow.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Lock, text: "Fonds bloqués jusqu'à validation client" },
                  { icon: Globe, text: 'Mobile Money local (Orange, MTN, Wave…)' },
                  { icon: Users, text: 'Client paie sans créer de compte' },
                  { icon: TrendingUp, text: 'Prestataire : solde, retraits, KYC' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: Shield, title: 'Escrow', desc: 'Protection bilatérale' },
                { icon: Zap, title: 'Rapide', desc: 'Liens en 30 secondes' },
                { icon: Smartphone, title: 'Mobile first', desc: 'Pensé pour le téléphone' },
                { icon: CheckCircle, title: 'Transparent', desc: 'Suivi commande en direct' },
              ].map((item, i) => (
                <Card key={i} className="border-border/50">
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

      {/* Demo */}
      <section id="demo" className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Comment ça fonctionne</h2>
            <p className="text-muted-foreground">
              De la création du lien au paiement libéré — en moins de 2 minutes.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30"
          >
            <div className="flex aspect-video items-center justify-center">
              <p className="text-sm text-muted-foreground">Vidéo de démonstration — bientôt disponible</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border bg-secondary/20 py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Le parcours en 4 étapes</h2>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-4">
            {[
              { n: '1', t: 'Créer', d: 'Lien de paiement personnalisé' },
              { n: '2', t: 'Partager', d: 'WhatsApp, SMS, email' },
              { n: '3', t: 'Payer', d: 'Mobile Money → escrow' },
              { n: '4', t: 'Valider', d: 'Client OK → fonds libérés' },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg">
                  {step.n}
                </div>
                <h3 className="font-semibold">{step.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages — marquee gauche → droite */}
      <section id="testimonials" className="overflow-hidden border-t border-border bg-muted/20 py-16 lg:py-20">
        <div className="container mx-auto mb-8 px-4 text-center">
          <h2 className="mb-2 text-3xl font-bold">Ils nous font confiance</h2>
          <p className="text-muted-foreground">Témoignages de prestataires — avis réels après validation admin</p>
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
                  <ProviderAvatar name={t.name} avatarUrl={t.avatar} size="sm" />
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
            <p className="text-muted-foreground">Choisissez le plan qui convient à votre entreprise</p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-md"
          >
            <Card className="overflow-hidden border-border shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold">{MVP_SUBSCRIPTION.name}</h3>
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

      {/* CTA */}
      <section className="bg-slate-950 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Rejoignez les prestataires qui sécurisent leurs ventes
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-slate-400">
              Inscription gratuite · Mobile Money · Escrow · Support dédié
            </p>
            <Button size="lg" asChild>
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
