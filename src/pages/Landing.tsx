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

      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28">

        <div className="container relative mx-auto px-4">

          <div className="mx-auto max-w-4xl text-center">

            <motion.h1

              initial={{ opacity: 0, y: 24 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ duration: 0.6 }}

              className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"

            >

              Le paiement qui protège prestataires & clients

            </motion.h1>

            <motion.p

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ delay: 0.1 }}

              className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl"

            >

              {SITE.description} Encaissement Mobile Money, fonds séquestrés, libération après validation — sans compte client obligatoire.

            </motion.p>

            <motion.div

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ delay: 0.2 }}

              className="flex flex-col items-center justify-center gap-4 sm:flex-row"

            >

              <Button size="lg" className="h-12 px-8" asChild>

                <Link to="/auth/signup">

                  Créer mon compte gratuit

                  <ArrowRight className="ml-2 h-5 w-5" />

                </Link>

              </Button>

              <Button size="lg" variant="outline" className="h-12 px-8 gap-2" asChild>

                <a href="#demo"><Play className="h-4 w-4" /> Voir la démo</a>

              </Button>

            </motion.div>

          </div>



          {/* Stats */}

          <motion.div

            initial={{ opacity: 0, y: 32 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ delay: 0.3 }}

            className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 rounded-2xl border border-border bg-card p-6 md:p-8"

          >

            <div className="text-center">

              <p className="text-2xl font-bold text-primary md:text-3xl"><AnimatedCounter value="100" suffix="%" /></p>

              <p className="text-xs text-muted-foreground md:text-sm">Escrow sécurisé</p>

            </div>

            <div className="text-center border-x border-border">

              <p className="text-2xl font-bold text-primary md:text-3xl"><AnimatedCounter value="2" suffix=" min" /></p>

              <p className="text-xs text-muted-foreground md:text-sm">Créer un lien</p>

            </div>

            <div className="text-center">

              <p className="text-2xl font-bold text-primary md:text-3xl"><AnimatedCounter value="0" suffix=" frais" /></p>

              <p className="text-xs text-muted-foreground md:text-sm">Inscription gratuite</p>

            </div>

          </motion.div>

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


