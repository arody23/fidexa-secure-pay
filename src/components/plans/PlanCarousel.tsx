import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllPlans,
  normalizePlanId,
  type BillingCycle,
  type PlanDefinition,
  type PlanId,
} from '@/lib/plans';

type Props = {
  /** Plan actuellement actif du prestataire (highlight) */
  currentPlanId?: string | null;
  /** Cycle affiché pour le prix */
  billingCycle?: BillingCycle;
  onBillingCycleChange?: (cycle: BillingCycle) => void;
  /** CTA sous la carte — reçoit le plan affiché */
  renderAction?: (plan: PlanDefinition, cycle: BillingCycle) => React.ReactNode;
  /** Variante landing (fond sombre déjà fourni) ou dashboard */
  variant?: 'dark' | 'light';
  /** Mode dashboard mobile : carte plus compacte */
  compact?: boolean;
  className?: string;
  initialPlanId?: PlanId;
};

/** Carrousel type Meta One : un plan à la fois, swipe / flèches / pastilles. */
export function PlanCarousel({
  currentPlanId,
  billingCycle: controlledCycle,
  onBillingCycleChange,
  renderAction,
  variant = 'dark',
  compact = false,
  className,
  initialPlanId = 'essentiel',
}: Props) {
  const plans = getAllPlans();
  const activeId = normalizePlanId(currentPlanId);
  const [index, setIndex] = useState(() => {
    const i = plans.findIndex((p) => p.id === initialPlanId);
    return i >= 0 ? i : 1;
  });
  const [internalCycle, setInternalCycle] = useState<BillingCycle>('monthly');
  const cycle = controlledCycle ?? internalCycle;
  const setCycle = (c: BillingCycle) => {
    onBillingCycleChange?.(c);
    if (controlledCycle == null) setInternalCycle(c);
  };

  const plan = plans[index]!;
  const isCurrent = plan.id === activeId;
  const price =
    cycle === 'yearly' && plan.priceYearlyUsd != null
      ? plan.priceYearlyUsd
      : plan.priceMonthlyUsd;
  const priceSuffix =
    plan.priceMonthlyUsd === 0
      ? 'USD / mois'
      : cycle === 'yearly'
        ? 'USD / an'
        : 'USD / mois';

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + plans.length) % plans.length);
  };

  const dark = variant === 'dark';

  return (
    <div className={cn('w-full', className)}>
      {(plan.priceMonthlyUsd > 0 || compact) && (
        <div className={cn('flex justify-center', compact ? 'mb-3' : 'mb-5')}>
          <div
            className={cn(
              'inline-flex rounded-full p-1 text-xs font-semibold',
              dark ? 'bg-white/10' : 'bg-[#eef3f9]'
            )}
          >
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={cn(
                'rounded-full px-4 py-2 transition',
                cycle === 'monthly'
                  ? dark
                    ? 'bg-[#2bb673] text-white'
                    : 'bg-[#0b3b78] text-white'
                  : dark
                    ? 'text-white/65'
                    : 'text-[#5c7188]'
              )}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              className={cn(
                'rounded-full px-4 py-2 transition',
                cycle === 'yearly'
                  ? dark
                    ? 'bg-[#2bb673] text-white'
                    : 'bg-[#0b3b78] text-white'
                  : dark
                    ? 'text-white/65'
                    : 'text-[#5c7188]'
              )}
            >
              Annuel
              <span className={cn('ml-1 font-normal', dark ? 'text-white/50' : 'text-[#8a9bb0]')}>
                (−2 mois)
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="relative mx-auto w-full max-w-md">
        <button
          type="button"
          aria-label="Plan précédent"
          onClick={() => go(-1)}
          className={cn(
            'absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition sm:left-3 sm:h-10 sm:w-10',
            dark
              ? 'border-white/20 bg-[#0b2f63]/95 text-white hover:bg-[#0d3a75]'
              : 'border-[#d7e3f0] bg-white/95 text-[#0b3b78] hover:bg-[#f5f8fc]'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Plan suivant"
          onClick={() => go(1)}
          className={cn(
            'absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition sm:right-3 sm:h-10 sm:w-10',
            dark
              ? 'border-white/20 bg-[#0b2f63]/95 text-white hover:bg-[#0d3a75]'
              : 'border-[#d7e3f0] bg-white/95 text-[#0b3b78] hover:bg-[#f5f8fc]'
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className={cn(
            'w-full overflow-hidden rounded-3xl border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]',
            compact ? 'px-4 py-4 sm:px-8 sm:py-7' : 'px-5 py-5 sm:px-10 sm:py-8',
            dark
              ? 'border-white/15 bg-white/[0.07] backdrop-blur-md'
              : 'border-[#e2eaf3] bg-white'
          )}
          onTouchStart={(e) => {
            (e.currentTarget as HTMLElement & { _tx?: number })._tx = e.touches[0]?.clientX;
          }}
          onTouchEnd={(e) => {
            const start = (e.currentTarget as HTMLElement & { _tx?: number })._tx;
            const end = e.changedTouches[0]?.clientX;
            if (start == null || end == null) return;
            const dx = end - start;
            if (dx > 48) go(-1);
            if (dx < -48) go(1);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-xs font-semibold uppercase tracking-[0.2em]',
                  dark ? 'text-[#6ce0a0]' : 'text-[#178c52]'
                )}
              >
                Plan {plan.name}
              </p>
              <h3
                className={cn(
                  'mt-1.5 font-semibold tracking-tight',
                  compact ? 'text-lg sm:text-2xl' : 'text-2xl',
                  dark ? 'text-white' : 'text-[#0b2f63]'
                )}
              >
                {plan.description}
              </h3>
            </div>
            {isCurrent ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                  dark ? 'bg-[#2bb673]/25 text-[#6ce0a0]' : 'bg-[#e8f8ef] text-[#178c52]'
                )}
              >
                Actuel
              </span>
            ) : plan.id === 'essentiel' ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                  dark ? 'bg-[#2bb673]/20 text-[#6ce0a0]' : 'bg-[#eef5ff] text-[#0b3b78]'
                )}
              >
                Populaire
              </span>
            ) : null}
          </div>

          <div className={cn('flex items-end gap-2', compact ? 'mt-4' : 'mt-7')}>
            <span
              className={cn(
                'font-semibold tracking-tight',
                compact ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl',
                dark ? 'text-white' : 'text-[#0b2f63]'
              )}
            >
              ${price}
            </span>
            <span className={cn('mb-1.5 text-sm', dark ? 'text-white/55' : 'text-[#8a9bb0]')}>
              {priceSuffix}
            </span>
          </div>
          <p className={cn('mt-1.5 text-sm', dark ? 'text-white/65' : 'text-[#5c7188]')}>
            Commission {plan.commission}&nbsp;% sur chaque transaction validée.
          </p>

          <ul
            className={cn(
              'space-y-2.5',
              compact
                ? 'mt-4 max-h-[28vh] overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible'
                : 'mt-7 space-y-3'
            )}
          >
            {plan.features.map((f) => (
              <li
                key={f}
                className={cn(
                  'flex items-start gap-2.5 text-sm',
                  dark ? 'text-white/85' : 'text-[#3d5168]'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                    dark ? 'bg-[#2bb673]' : 'bg-[#0b3b78]'
                  )}
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {renderAction ? (
            <div className={cn(compact ? 'mt-4' : 'mt-8')}>{renderAction(plan, cycle)}</div>
          ) : null}
        </div>
      </div>

      <div className={cn('flex items-center justify-center gap-2', compact ? 'mt-3' : 'mt-5')}>
        {plans.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={`Voir le plan ${p.name}`}
            onClick={() => setIndex(i)}
            className={cn(
              'h-2 rounded-full transition-all',
              i === index
                ? cn('w-7', dark ? 'bg-[#2bb673]' : 'bg-[#0b3b78]')
                : cn('w-2', dark ? 'bg-white/30' : 'bg-[#c5d4e4]')
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'mt-3 text-center text-xs',
          dark ? 'text-white/45' : 'text-[#8a9bb0]'
        )}
      >
        Glissez ou cliquez pour comparer les plans
      </p>
    </div>
  );
}
