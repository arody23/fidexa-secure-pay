import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const COVERED_COUNTRIES = [
  { id: 'bj', name: 'Bénin', flagSrc: '/assets/flags/bj.svg' },
  { id: 'bf', name: 'Burkina Faso', flagSrc: '/assets/flags/bf.svg' },
  { id: 'ci', name: "Côte d'Ivoire", flagSrc: '/assets/flags/ci.svg' },
  { id: 'cd', name: 'RD Congo', flagSrc: '/assets/flags/cd.svg' },
  { id: 'cg', name: 'Congo', flagSrc: '/assets/flags/cg.svg' },
  { id: 'ml', name: 'Mali', flagSrc: '/assets/flags/ml.svg' },
  { id: 'tg', name: 'Togo', flagSrc: '/assets/flags/tg.svg' },
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
  const activeCountry = COVERED_COUNTRIES[active] ?? COVERED_COUNTRIES[5];

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
        <div
          className={cn(
            'pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2.5 shadow-sm backdrop-blur-sm',
            isLight
              ? 'border-black/[0.06] bg-white/95'
              : 'border-white/10 bg-[#0B1220]/85'
          )}
        >
          <img src={activeCountry.flagSrc} alt="" className="h-5 w-7 rounded-sm object-cover" />
          <span className={cn('text-sm font-semibold', isLight ? 'text-[#1A3A5C]' : 'text-white')}>
            {activeCountry.name}
          </span>
          <span className={cn('h-4 w-px', isLight ? 'bg-black/10' : 'bg-white/15')} aria-hidden />
          <span className={cn('text-xs', isLight ? 'text-[#6B7280]' : 'text-white/60')}>Couvert</span>
        </div>
      </div>

      {showLegend && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {COVERED_COUNTRIES.map((c, i) => (
            <li
              key={c.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                i === active
                  ? 'border-[#2BB673]/50 bg-[#E8F8F0] text-[#1A3A5C]'
                  : 'border-black/[0.06] bg-white text-[#6B7280]'
              )}
            >
              <img src={c.flagSrc} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" loading="lazy" />
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AfricaCoverageMap;
