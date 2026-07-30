import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';
import SiteFooter from '@/components/layout/SiteFooter';
import { MVP_SUBSCRIPTION, SITE } from '@/config/site';
import { useAuth } from '@/contexts/AuthContext';



function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {

  const ref = useRef(null);

  const inView = useInView(ref, { once: true });

  return (

    <motion.span ref={ref} initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}}>

      {value}{suffix}

    </motion.span>

  );

}



const Landing = () => {
  const { user } = useAuth();

  return (

    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* Nav */}

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">

        <div className="container mx-auto flex h-16 items-center justify-between px-4">

          <Logo />

          <div className="hidden items-center gap-8 md:flex">

            <a href="#mission" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Mission</a>

            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Démo</a>

            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Processus</a>

            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>

          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <Button size="sm" asChild>
                <Link to="/dashboard">Mon espace</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/auth/signin">Connexion</Link></Button>
                <Button size="sm" asChild><Link to="/auth/signup">Commencer</Link></Button>
              </>
            )}
          </div>

        </div>

      </nav>



      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--fidexa-navy))] pt-24 pb-16 text-white lg:pt-28 lg:pb-24">
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
                <Button size="lg" className="h-12 bg-[hsl(var(--fidexa-green))] px-8 text-white hover:bg-[hsl(var(--fidexa-green-dark))]" asChild>
                  <Link to="/auth/signup">
                    Créer mon compte gratuit
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-8 text-white hover:bg-white/10" asChild>
                  <a href="#demo">
                    <Play className="mr-2 h-4 w-4" /> Voir la démo
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

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[
                      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=96&h=96&fit=crop&crop=face',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face',
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face',
                      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=96&h=96&fit=crop&crop=face',
                    ].map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="h-9 w-9 rounded-full border-2 border-[hsl(var(--fidexa-navy))] object-cover"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-white/75">
                    <span className="font-semibold text-white">+150 prestataires</span> nous font confiance
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.55 }}
              className="relative"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:p-6">
                <p className="mb-4 text-sm font-medium text-white/70">Comment FidexaPay protège vos paiements</p>
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { step: '1', title: 'Paiement', desc: 'Mobile Money' },
                    { step: '2', title: 'Escrow', desc: 'Fonds bloqués' },
                    { step: '3', title: 'Libération', desc: 'Après validation' },
                  ].map((s) => (
                    <div key={s.step} className="rounded-xl bg-[hsl(var(--fidexa-navy-dark))]/60 p-3 text-center">
                      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--fidexa-green))] text-sm font-bold">
                        {s.step}
                      </div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-white/55">{s.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Carte Afrique simplifiée — pays opérationnels */}
                <div className="relative mx-auto max-w-sm">
                  <svg viewBox="0 0 360 400" className="h-auto w-full" aria-label="Afrique — pays FidexaPay">
                    <path
                      d="M180 28c22 8 48 18 62 42 14 24 18 48 12 72 8 10 22 28 24 48 2 22-8 40-22 52 6 18 4 40-8 56-14 18-36 28-58 34-10 28-28 52-52 64-18-8-34-22-42-42-16-6-34-18-42-36-8-18-4-40 6-54-14-16-22-36-18-56 4-22 20-38 38-46-4-22 2-48 18-64 18-18 46-28 82-30z"
                      fill="hsl(213 40% 22%)"
                      stroke="hsl(213 30% 35%)"
                      strokeWidth="2"
                    />
                    {/* Markers: CI, BJ, TG, BF, ML, CD, CG */}
                    {[
                      { x: 128, y: 168, label: "CI" },
                      { x: 148, y: 172, label: "BJ" },
                      { x: 158, y: 178, label: "TG" },
                      { x: 138, y: 148, label: "BF" },
                      { x: 132, y: 128, label: "ML" },
                      { x: 198, y: 248, label: "CD" },
                      { x: 178, y: 238, label: "CG" },
                    ].map((m) => (
                      <g key={m.label}>
                        <circle cx={m.x} cy={m.y} r="7" fill="hsl(152 62% 44%)" />
                        <circle cx={m.x} cy={m.y} r="11" fill="none" stroke="hsl(152 62% 54%)" strokeWidth="1.5" opacity="0.7" />
                      </g>
                    ))}
                  </svg>
                  <p className="mt-2 text-center text-xs text-white/50">
                    Zones actives : Afrique de l&apos;Ouest &amp; Congo
                  </p>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-3">
                    <p className="text-xs font-semibold text-red-200">Sans FidexaPay</p>
                    <p className="mt-1 text-xs text-white/65">Litiges, non-paiement, perte de temps et de confiance.</p>
                  </div>
                  <div className="rounded-lg border border-[hsl(var(--fidexa-green))]/30 bg-[hsl(var(--fidexa-green))]/10 p-3">
                    <p className="text-xs font-semibold text-[hsl(var(--fidexa-green-light))]">Avec FidexaPay</p>
                    <p className="mt-1 text-xs text-white/65">Paiement protégé, livraison validée, fonds libérés.</p>
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

            <motion.div

              initial={{ opacity: 0, x: -24 }}

              whileInView={{ opacity: 1, x: 0 }}

              viewport={{ once: true }}

            >

              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Pourquoi FidexaPay est indispensable</h2>

              <p className="mb-6 text-muted-foreground leading-relaxed">

                En Afrique, la confiance bloque les ventes en ligne : le client craint de payer sans recevoir, le prestataire craint de livrer sans être payé. FidexaPay résout ce dilemme avec un tiers de confiance — l&apos;escrow.

              </p>

              <ul className="space-y-4">

                {[

                  { icon: Lock, text: 'Fonds bloqués jusqu\'à validation client' },

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



      {/* Demo video — emplacement réservé */}

      <section id="demo" className="py-20 lg:py-28">

        <div className="container mx-auto px-4">

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 text-center">

            <h2 className="mb-3 text-3xl font-bold md:text-4xl">Comment ça fonctionne</h2>

            <p className="text-muted-foreground">De la création du lien au paiement libéré — en moins de 2 minutes.</p>

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

                <motion.div

                  whileHover={{ scale: 1.05 }}

                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg"

                >

                  {step.n}

                </motion.div>

                <h3 className="font-semibold">{step.t}</h3>

                <p className="mt-1 text-sm text-muted-foreground">{step.d}</p>

              </motion.div>

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

            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Rejoignez les prestataires qui sécurisent leurs ventes</h2>

            <p className="mx-auto mb-8 max-w-xl text-slate-400">

              Inscription gratuite · Mobile Money · Escrow · Support dédié

            </p>

            <Button size="lg" asChild>

              <Link to="/auth/signup">Créer mon compte <ArrowRight className="ml-2 h-5 w-5" /></Link>

            </Button>

          </motion.div>

        </div>

      </section>



      <SiteFooter />

    </div>

  );

};



export default Landing;


