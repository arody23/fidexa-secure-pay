import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** 7 pays couverts FidexaPay — positions relatives sur la carte */
export const COVERED_COUNTRIES = [
  { id: 'sn', name: 'Sénégal', flagSrc: '/assets/flags/sn.svg', x: 18.5, y: 31.5 },
  { id: 'ci', name: "Côte d'Ivoire", flagSrc: '/assets/flags/ci.svg', x: 28.5, y: 46.5 },
  { id: 'bj', name: 'Bénin', flagSrc: '/assets/flags/bj.svg', x: 36.2, y: 44.5 },
  { id: 'cm', name: 'Cameroun', flagSrc: '/assets/flags/cm.svg', x: 44.5, y: 49 },
  { id: 'ga', name: 'Gabon', flagSrc: '/assets/flags/ga.svg', x: 45.5, y: 55.5 },
  { id: 'cg', name: 'Congo', flagSrc: '/assets/flags/cg.svg', x: 48.5, y: 56 },
  { id: 'cd', name: 'RD Congo', flagSrc: '/assets/flags/cd.svg', x: 54.5, y: 60 },
] as const;

type AfricaCoverageMapProps = {
  className?: string;
  showLegend?: boolean;
  theme?: 'light' | 'dark';
  activeIndex?: number;
};

export function AfricaCoverageMap({
  className,
  showLegend = true,
  theme = 'light',
  activeIndex,
}: AfricaCoverageMapProps) {
  const isLight = theme === 'light';
  const [internalActive, setInternalActive] = useState(0);
  const active = activeIndex ?? internalActive;
  const activeCountry = COVERED_COUNTRIES[active] ?? COVERED_COUNTRIES[0];

  useEffect(() => {
    if (activeIndex !== undefined) return;
    const id = window.setInterval(
      () => setInternalActive((i) => (i + 1) % COVERED_COUNTRIES.length),
      2800
    );
    return () => window.clearInterval(id);
  }, [activeIndex]);

  return (
    <div className={cn('w-full', className)}>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-3xl bg-white">
        <img
          src="/assets/brand/fidexapay-africa-coverage.png"
          alt="Carte de l'Afrique montrant les sept pays couverts par FidexaPay"
          className="h-full w-full object-contain"
          loading="lazy"
        />

        {COVERED_COUNTRIES.map((country, i) => {
          const isActive = i === active;
          return (
            <div
              key={country.id}
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${country.x}%`, top: `${country.y}%` }}
              aria-hidden
            >
              <AnimatePresence>
                {isActive && (
                  <>
                    <motion.span
                      key={`pulse-${country.id}`}
                      initial={{ opacity: 0.6, scale: 0.6 }}
                      animate={{ opacity: [0.55, 0], scale: [0.7, 2.4] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2bb673]/35"
                    />
                    <motion.span
                      key={`glow-${country.id}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.25, 1] }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2bb673]/25 blur-md"
                    />
                  </>
                )}
              </AnimatePresence>
              <motion.span
                animate={
                  isActive
                    ? {
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(43,182,115,0.5)',
                          '0 0 0 10px rgba(43,182,115,0)',
                          '0 0 0 0 rgba(43,182,115,0.5)',
                        ],
                      }
                    : { scale: 1, boxShadow: '0 0 0 0 rgba(43,182,115,0)' }
                }
                transition={isActive ? { duration: 1.5, repeat: Infinity } : { duration: 0.25 }}
                className={cn(
                  'relative block h-3 w-3 rounded-full border-2 border-white',
                  isActive ? 'bg-[#2bb673]' : 'bg-[#9bb8d4]/70'
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCountry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className={cn(
              'inline-flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-sm',
              isLight ? 'border-black/[0.06] bg-white' : 'border-white/10 bg-[#0B1220]/85'
            )}
          >
            <img src={activeCountry.flagSrc} alt="" className="h-5 w-7 rounded-sm object-cover" />
            <span className={cn('text-sm font-semibold', isLight ? 'text-[#1A3A5C]' : 'text-white')}>
              {activeCountry.name}
            </span>
            <span className={cn('h-4 w-px', isLight ? 'bg-black/10' : 'bg-white/15')} aria-hidden />
            <span className={cn('text-xs', isLight ? 'text-[#6B7280]' : 'text-white/60')}>Couvert</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {showLegend && (
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {COVERED_COUNTRIES.map((c, i) => (
            <li key={c.id}>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs',
                  i === active
                    ? 'border-[#2BB673]/40 bg-[#E8F8F0] text-[#1A3A5C]'
                    : 'border-black/[0.06] bg-white text-[#5c7188]'
                )}
              >
                <img src={c.flagSrc} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />
                {c.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
