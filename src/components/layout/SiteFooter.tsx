import { Link } from 'react-router-dom';

import { Mail, MapPin, Phone } from 'lucide-react';

import Logo from '@/components/Logo';

import { SITE } from '@/config/site';



const legalItems = [

  {

    href: SITE.legal.privacy,

    title: 'Politique de confidentialité',

    description: 'Collecte, utilisation et protection de vos données personnelles.',

  },

  {

    href: SITE.legal.terms,

    title: "Conditions d'utilisation",

    description: 'Règles d\'accès et d\'utilisation de la plateforme FidexaPay.',

  },

  {

    href: SITE.legal.cookies,

    title: 'Politique cookies',

    description: 'Types de cookies utilisés et gestion de vos préférences.',

  },

];



export default function SiteFooter() {

  return (

    <footer className="border-t border-border bg-card">

      <div className="container mx-auto px-4 py-16">

        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">

          <div className="space-y-4">

            <Logo />

            <p className="text-sm text-muted-foreground leading-relaxed">{SITE.description}</p>

          </div>



          <div>

            <h4 className="mb-4 font-semibold">Produit</h4>

            <ul className="space-y-2 text-sm text-muted-foreground">

              <li><a href="/#mission" className="hover:text-primary transition-colors">Notre mission</a></li>

              <li><a href="/#how-it-works" className="hover:text-primary transition-colors">Comment ça marche</a></li>

              <li><a href="/#pricing" className="hover:text-primary transition-colors">Tarifs</a></li>

              <li><Link to="/auth/signup" className="hover:text-primary transition-colors">Créer un compte</Link></li>

            </ul>

          </div>



          <div>

            <h4 className="mb-4 font-semibold">Légal</h4>

            <ul className="space-y-4 text-sm">

              {legalItems.map((item) => (

                <li key={item.href}>

                  <Link to={item.href} className="font-medium text-foreground hover:text-primary transition-colors">

                    {item.title}

                  </Link>

                  <p className="mt-0.5 text-muted-foreground">{item.description}</p>

                </li>

              ))}

            </ul>

          </div>



          <div>

            <h4 className="mb-4 font-semibold">Contact</h4>

            <ul className="space-y-3 text-sm text-muted-foreground">

              <li className="flex items-start gap-2">

                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <a href={`mailto:${SITE.email}`} className="hover:text-primary">{SITE.email}</a>

              </li>

              <li className="flex items-start gap-2">

                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <a href="tel:+234842726674" className="hover:text-primary">+234 842 726 674</a>

              </li>

              <li className="flex items-start gap-2">

                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                <span>{SITE.address}</span>

              </li>

            </ul>

          </div>

        </div>



        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">

          <p className="text-sm text-muted-foreground">

            © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.

          </p>

          <p className="text-xs text-muted-foreground">

            Paiements sécurisés · Mobile Money · Escrow

          </p>

        </div>

      </div>

    </footer>

  );

}


