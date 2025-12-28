import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield,
  CreditCard,
  Users,
  CheckCircle,
  ArrowRight,
  Star,
  Lock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/Logo";

const features = [
  {
    icon: Shield,
    title: "Paiement Séquestré",
    description:
      "Vos fonds sont protégés jusqu'à la validation de la livraison. Sécurité garantie.",
  },
  {
    icon: CreditCard,
    title: "Transactions Simples",
    description:
      "Créez des liens de paiement en 30 secondes et partagez-les partout.",
  },
  {
    icon: Users,
    title: "Sans Compte Client",
    description:
      "Vos clients paient et suivent leurs commandes sans créer de compte.",
  },
  {
    icon: CheckCircle,
    title: "Validation Automatique",
    description:
      "Le paiement est libéré automatiquement après validation de la livraison.",
  },
];

const plans = [
  {
    name: "Basique",
    price: "Gratuit",
    commission: "15%",
    features: ["Commandes illimitées", "Liens de paiement", "Support email"],
    highlight: false,
  },
  {
    name: "Essentiel",
    price: "15$",
    period: "/mois",
    commission: "6%",
    features: [
      "20 commandes/mois",
      "Profil complet",
      "Notifications automatiques",
      "Feedback clients",
    ],
    highlight: false,
  },
  {
    name: "Standard",
    price: "29$",
    period: "/mois",
    commission: "4%",
    features: [
      "40 commandes/mois",
      "Support prioritaire",
      "Historique complet",
      "Plafond 5k-20k",
    ],
    highlight: true,
  },
  {
    name: "Premium",
    price: "49$",
    period: "/mois",
    commission: "0%",
    features: [
      "Commandes illimitées",
      "0% commission",
      "Support dédié",
      "API access",
    ],
    highlight: false,
  },
];

const testimonials = [
  {
    name: "Marie K.",
    role: "Artisane",
    content:
      "FIDEXA a transformé ma façon de vendre. Mes clients ont confiance et je suis payée en toute sécurité.",
    rating: 5,
  },
  {
    name: "Jean-Pierre M.",
    role: "Consultant",
    content:
      "Simple, efficace, professionnel. Je recommande à tous les indépendants.",
    rating: 5,
  },
  {
    name: "Amina D.",
    role: "E-commerçante",
    content:
      "Le suivi des commandes sans compte client est génial. Mes ventes ont augmenté de 40%.",
    rating: 5,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo showSlogan={false} />
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Fonctionnalités
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Tarifs
            </a>
            <a
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Témoignages
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Connexion</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/dashboard">Commencer</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary"
            >
              <Lock className="h-4 w-4" />
              Paiements sécurisés via escrow
            </motion.div>
            
            <h1 className="mb-6 font-display text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Payer et livrer{" "}
              <span className="text-secondary">en toute sérénité.</span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
              La plateforme qui sécurise vos transactions entre prestataires et
              clients. Paiement séquestré, suivi simplifié, confiance renforcée.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="hero" size="xl" asChild>
                <Link to="/dashboard">
                  Créer mon compte gratuit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/pay/demo">Voir une démo</Link>
              </Button>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Setup en 2 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>100% sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <span>4.9/5 avis</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              Pourquoi choisir FIDEXA?
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Une solution complète pour sécuriser vos transactions et renforcer
              la confiance avec vos clients.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="group h-full border-border/50 bg-card hover:border-primary/30 transition-colors duration-300">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 font-display text-lg font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              Comment ça marche?
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Un processus simple et sécurisé en 4 étapes.
            </p>
          </motion.div>

          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "1", title: "Créer", desc: "Créez un lien de paiement personnalisé" },
                { step: "2", title: "Partager", desc: "Envoyez le lien à votre client" },
                { step: "3", title: "Payer", desc: "Le client paie, les fonds sont séquestrés" },
                { step: "4", title: "Valider", desc: "Livraison validée, paiement libéré" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              Tarifs transparents
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Choisissez le plan adapté à votre activité. Commencez gratuitement.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {plans.map((plan, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card
                  className={`h-full ${
                    plan.highlight
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-border/50"
                  }`}
                >
                  <CardContent className="p-6">
                    {plan.highlight && (
                      <div className="mb-4 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        Populaire
                      </div>
                    )}
                    <h3 className="mb-2 font-display text-xl font-semibold">
                      {plan.name}
                    </h3>
                    <div className="mb-1">
                      <span className="font-display text-4xl font-bold">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                    <p className="mb-6 text-sm text-muted-foreground">
                      Commission: {plan.commission}
                    </p>
                    <ul className="mb-6 space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.highlight ? "hero" : "outline"}
                      className="w-full"
                    >
                      Commencer
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              Ce que disent nos utilisateurs
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-3"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="mb-4 flex gap-1">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-warning text-warning"
                        />
                      ))}
                    </div>
                    <p className="mb-4 text-muted-foreground">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">
              Prêt à sécuriser vos transactions?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-background/70">
              Rejoignez des milliers de prestataires qui font confiance à FIDEXA.
            </p>
            <Button
              size="xl"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <Link to="/dashboard">
                Créer mon compte gratuit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Logo showSlogan />
            <p className="text-sm text-muted-foreground">
              © 2024 FIDEXA. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Confidentialité
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Conditions
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
