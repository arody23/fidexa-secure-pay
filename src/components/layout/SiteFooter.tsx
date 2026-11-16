import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import Logo from '@/components/Logo';
import { SITE } from '@/config/site';

const productLinks = [
  { href: '/#escrow', label: 'Comment ça marche' },
  { href: '/#payments', label: 'Mobile Money' },
  { href: '/#use-cases', label: 'Cas d’usage' },
  { href: '/#pricing', label: 'Tarifs' },
  { href: '/#faq', label: 'FAQ' },
];

const legalLinks = [
  { href: SITE.legal.terms, label: 'Conditions d’utilisation' },
  { href: SITE.legal.privacy, label: 'Confidentialité' },
  { href: SITE.legal.escrow, label: 'Politique escrow' },
  { href: SITE.legal.refund, label: 'Remboursements' },
  { href: SITE.legal.disputes, label: 'Litiges' },
  { href: SITE.legal.kycAml, label: 'KYC / AML' },
  { href: SITE.legal.cookies, label: 'Cookies' },
];

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#061428] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 10% 0%, rgba(43,182,115,0.12), transparent 50%), radial-gradient(ellipse 40% 35% at 90% 100%, rgba(19,84,184,0.18), transparent 55%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div className="max-w-sm space-y-5">
            <Logo variant="white" />
            <p className="text-sm leading-relaxed text-white/65">{SITE.description}</p>
            <Link
              to="/auth/signup"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#2bb673] px-5 text-sm font-semibold text-white transition hover:bg-[#24a367]"
            >
              Créer mon compte
            </Link>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide text-white">Produit</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="transition hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/auth/signup" className="transition hover:text-white">
                  Espace prestataire
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide text-white">Légal</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wide text-white">Contact</h4>
            <ul className="mt-5 space-y-4 text-sm text-white/60">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#6ce0a0]" />
                <a href={`mailto:${SITE.email}`} className="break-all transition hover:text-white">
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#6ce0a0]" />
                <a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="transition hover:text-white">
                  {SITE.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#6ce0a0]" />
                <span>{SITE.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="text-sm text-white/45">
            © {new Date().getFullYear()} {SITE.name}. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
