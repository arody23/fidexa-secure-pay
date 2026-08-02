import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';

/** Covered countries — order matches landing-04 list + mockup pill default (Mali) */
export const COVERED_COUNTRIES = [
  { id: 'bj', name: 'Bénin', flag: '🇧🇯', cx: 168, cy: 198 },
  { id: 'bf', name: 'Burkina Faso', flag: '🇧🇫', cx: 148, cy: 158 },
  { id: 'ci', name: "Côte d'Ivoire", flag: '🇨🇮', cx: 118, cy: 198 },
  { id: 'cd', name: 'RD Congo', flag: '🇨🇩', cx: 218, cy: 268 },
  { id: 'cg', name: 'Congo', flag: '🇨🇬', cx: 214, cy: 212 },
  { id: 'ml', name: 'Mali', flag: '🇲🇱', cx: 132, cy: 118 },
  { id: 'tg', name: 'Togo', flag: '🇹🇬', cx: 152, cy: 202 },
] as const;

/** Simplified Africa + 7 covered countries — ref landing-04-coverage.png */
const AFRICA_BASE =
  'M178 18c14 2 28 8 38 18 8 8 14 18 13 29-1 8-1 14 4 20 6 8 10 16 9 26-2 12-8 22-16 30-4 5-5 11-2 16 3 6 3 13-2 19-6 9-15 16-26 20-8 3-14 8-16 15-2 6-6 11-12 13-8 2-16 0-21-6-3-4-8-6-13-5-6 1-12-1-16-7-4-6-3-13 2-18 3-4 3-9 0-13-4-6-4-13-1-19 3-6 3-13 0-18-3-5-2-11 3-15 6-5 13-6 20-4 5 2 9 1 12-2 5-5 10-9 18-9 3 0 6-1 9-3 8-6 18-10 29-10 2 0 4 0 6-1z';

const COUNTRY_PATHS: Record<(typeof COVERED_COUNTRIES)[number]['id'], string> = {
  ml: 'M118 98 152 92 168 108 162 132 138 138 112 128Z',
  bf: 'M138 138 168 132 182 152 176 168 148 172 128 158Z',
  ci: 'M108 168 132 158 142 182 128 208 102 198 96 178Z',
  tg: 'M142 182 152 178 156 198 150 214 140 210Z',
  bj: 'M152 178 168 172 174 192 168 212 154 208 148 188Z',
  cg: 'M198 198 228 188 238 208 228 222 204 218Z',
  cd: 'M188 218 238 208 252 248 242 298 208 312 178 278 182 238Z',
};

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
  const uid = useId().replace(/:/g, '');
  const glowId = `mintGlow-${uid}`;
  const isLight = theme === 'light';
  const [internalActive, setInternalActive] = useState(5); // Mali — mockup default
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
      <div className="relative mx-auto aspect-[4/5] w-full max-w-md sm:max-w-lg">
        <svg
          viewBox="0 0 360 420"
          className="h-full w-full"
          role="img"
          aria-label="Carte de l'Afrique — pays couverts par FidexaPay"
        >
          <defs>
            <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Continent — light blue-grey silhouette (maquette) */}
          <path d={AFRICA_BASE} fill="#D4DEE8" />

          {/* Covered countries — always navy filled */}
          {COVERED_COUNTRIES.map((c) => (
            <path
              key={c.id}
              d={COUNTRY_PATHS[c.id]}
              fill="#1A3A5C"
              className="transition-opacity duration-300"
              opacity={activeCountry.id === c.id ? 1 : 0.92}
            />
          ))}

          {/* Mint glow dots */}
          {COVERED_COUNTRIES.map((c, i) => {
            const isOn = i === active;
            return (
              <g key={`dot-${c.id}`} filter={isOn ? `url(#${glowId})` : undefined}>
                {isOn && (
                  <circle cx={c.cx} cy={c.cy} r="14" fill="#2BB673" opacity="0.25">
                    <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={c.cx}
                  cy={c.cy}
                  r={isOn ? 6 : 4.5}
                  fill="#2BB673"
                  opacity={isOn ? 1 : 0.75}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}
        </svg>

        {/* Active country pill — ref landing-04 bottom center */}
        <div
          className={cn(
            'pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2.5 shadow-sm backdrop-blur-sm',
            isLight
              ? 'border-black/[0.06] bg-white/95'
              : 'border-white/10 bg-[#0B1220]/85'
          )}
        >
          <span
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A3A5C]"
            aria-hidden
          >
            <span className="h-2 w-2 rounded-full bg-[#2BB673]" />
          </span>
          <span className={cn('text-sm font-semibold', isLight ? 'text-[#1A3A5C]' : 'text-white')}>
            {activeCountry.name}
          </span>
          <span className={cn('h-4 w-px', isLight ? 'bg-black/10' : 'bg-white/15')} aria-hidden />
          <span className={cn('text-xs', isLight ? 'text-[#6B7280]' : 'text-white/60')}>
            Pays actif
          </span>
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
              <span aria-hidden>{c.flag}</span>
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AfricaCoverageMap;
