import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import { SITE } from '@/config/site';

const LEGAL_LINKS = [
  { href: SITE.legal.terms, label: 'Conditions' },
  { href: SITE.legal.privacy, label: 'Confidentialité' },
  { href: SITE.legal.cookies, label: 'Cookies' },
  { href: '/#pricing', label: 'Tarifs' },
  { href: '/#faq', label: 'Aide' },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-fidexa-ink">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 15% 20%, hsl(152 62% 44% / 0.22), transparent 55%), radial-gradient(ellipse 60% 45% at 90% 80%, hsl(213 58% 35% / 0.45), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8">
          <Logo variant="white" />
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>

        <footer className="mt-10 w-full max-w-md px-1 text-center">
          <p className="text-[11px] leading-relaxed text-white/45">
            En continuant, vous acceptez nos{' '}
            <Link to={SITE.legal.terms} className="underline decoration-white/30 underline-offset-2 hover:text-white/70">
              Conditions d&apos;utilisation
            </Link>
            , notre{' '}
            <Link to={SITE.legal.privacy} className="underline decoration-white/30 underline-offset-2 hover:text-white/70">
              Politique de confidentialité
            </Link>{' '}
            et notre{' '}
            <Link to={SITE.legal.cookies} className="underline decoration-white/30 underline-offset-2 hover:text-white/70">
              Utilisation des cookies
            </Link>
            .
          </p>
          <nav
            className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-white/40"
            aria-label="Liens légaux"
          >
            {LEGAL_LINKS.map((l, i) => (
              <span key={l.href} className="inline-flex items-center gap-3">
                {i > 0 ? <span className="text-white/20" aria-hidden>·</span> : null}
                <Link to={l.href} className="hover:text-white/70">
                  {l.label}
                </Link>
              </span>
            ))}
          </nav>
          <p className="mt-3 text-[10px] text-white/30">© {SITE.founded} {SITE.name}</p>
        </footer>
      </div>
    </div>
  );
}
