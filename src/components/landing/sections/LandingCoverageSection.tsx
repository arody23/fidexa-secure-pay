import { ChevronRight } from 'lucide-react';
import Logo from '@/components/Logo';
import { AfricaCoverageMap, COVERED_COUNTRIES } from '@/components/brand/AfricaCoverageMap';
import { cn } from '@/lib/utils';

type Props = {
  activeCountry: number;
  onSelectCountry: (index: number) => void;
};

/** Ref: landing-04-coverage.png */
export function LandingCoverageSection({ activeCountry, onSelectCountry }: Props) {
  return (
    <section id="coverage" className="bg-[#F5F7FA] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <Logo size="sm" className="mb-8" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2BB673]">
              Couverture pays
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1A3A5C] sm:text-4xl">
              {COVERED_COUNTRIES.length} pays couverts
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-[#6B7280] sm:text-base">
              FidexaPay vous permet d&apos;envoyer, recevoir et dépenser de l&apos;argent dans{' '}
              {COVERED_COUNTRIES.length} pays d&apos;Afrique de l&apos;Ouest et d&apos;Afrique centrale.
            </p>
            <ul className="mt-8 space-y-2">
              {COVERED_COUNTRIES.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCountry(i)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3.5 text-left shadow-sm transition duration-200',
                      activeCountry === i
                        ? 'border-[#2BB673]/40 ring-1 ring-[#2BB673]/20'
                        : 'border-black/[0.06] hover:border-[#1A3A5C]/15'
                    )}
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-[#1A3A5C]">
                      <img src={c.flagSrc} alt="" className="h-5 w-7 rounded-sm object-cover" loading="lazy" />
                      {c.name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#6B7280]/60" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-xs text-[#6B7280]">
              <span className="h-2 w-2 rounded-full bg-[#2BB673]" aria-hidden />
              Couverture FidexaPay
            </p>
          </div>
          <AfricaCoverageMap theme="light" showLegend={false} activeIndex={activeCountry} />
        </div>
      </div>
    </section>
  );
}
