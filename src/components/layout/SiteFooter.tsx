import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import Logo from '@/components/Logo';
import { SITE } from '@/config/site';

const legalItems = [
  {
    href: SITE.legal.terms,
    title: "Conditions Générales d'Utilisation (CGU)",
  },
  {
    href: SITE.legal.privacy,
    title: 'Politique de Confidentialité',
  },
  {
    href: SITE.legal.escrow,
    title: 'Politique de Paiement Sécurisé et de Séquestration (Escrow)',
  },
  {
    href: SITE.legal.refund,
    title: 'Politique de Remboursement',
  },
  {
    href: SITE.legal.disputes,
    title: 'Politique de Gestion des Litiges',
  },
  {
    href: SITE.legal.kycAml,
    title: 'Politique KYC/AML et Activités Interdites',
  },
  {
    href: SITE.legal.cookies,
    title: 'Politique cookies',
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">{SITE.description}</p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/#mission" className="transition-colors hover:text-primary">
                  Notre mission
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="transition-colors hover:text-primary">
                  Comment ça marche
                </a>
              </li>
              <li>
                <a href="/#pricing" className="transition-colors hover:text-primary">
                  Tarifs
                </a>
              </li>
              <li>
                <Link to="/auth/signup" className="transition-colors hover:text-primary">
                  Créer un compte
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="mb-4 font-semibold">Légal</h4>
            <ul className="space-y-2.5 text-sm">
              {legalItems.map((item) => (
                <li key={item.href} className="min-w-0">
                  <Link
                    to={item.href}
                    className="break-words font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Contact</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href={`mailto:${SITE.email}`} className="break-all hover:text-primary">
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+234842726674" className="hover:text-primary">
                  +234 842 726 674
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{SITE.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">Paiements sécurisés · Mobile Money · Escrow</p>
        </div>
      </div>
    </footer>
  );
}
