import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Sparkles, Crown, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllPlans,
  normalizePlanId,
  yearlySavingsUsd,
  type BillingCycle,
  type PlanDefinition,
  type PlanId,
} from '@/lib/plans';

type Props = {
  currentPlanId?: string | null;
  billingCycle?: BillingCycle;
  onBillingCycleChange?: (cycle: BillingCycle) => void;
  renderAction?: (plan: PlanDefinition, cycle: BillingCycle) => React.ReactNode;
  variant?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
  initialPlanId?: PlanId;
};

const PLAN_THEME: Record<
  PlanId,
  {
    Icon: typeof Leaf;
    accent: string;
    badge: string;
    card: string;
    check: string;
    price: string;
    muted: string;
    title: string;
    feature: string;
  }
> = {
  basique: {
    Icon: Leaf,
    accent: 'text-[#178c52]',
    badge: 'bg-[#e8f8ef] text-[#178c52]',
    card: 'border-[#cfe9db] bg-gradient-to-b from-[#f7fbf8] to-white',
    check: 'bg-[#2bb673]',
    price: 'text-[#0b2f63]',
    muted: 'text-[#5c7188]',
    title: 'text-[#0b2f63]',
    feature: 'text-[#3d5168]',
  },
  essentiel: {
    Icon: Sparkles,
    accent: 'text-[#0b3b78]',
    badge: 'bg-[#0b3b78] text-white',
    card: 'border-[#0b3b78]/35 bg-gradient-to-b from-[#eef5ff] via-white to-white shadow-[0_20px_50px_-24px_rgba(11,59,120,.45)]',
    check: 'bg-[#0b3b78]',
    price: 'text-[#0b2f63]',
    muted: 'text-[#5c7188]',
    title: 'text-[#0b2f63]',
    feature: 'text-[#3d5168]',
  },
  premium: {
    Icon: Crown,
    accent: 'text-[#c9a227]',
    badge: 'bg-[#1a1520] text-[#f0d78c]',
    card: 'border-[#2a2433] bg-gradient-to-br from-[#1a1520] via-[#241c2e] to-[#0f1624] text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)]',
    check: 'bg-[#c9a227]',
    price: 'text-white',
    muted: 'text-white/65',
    title: 'text-white',
    feature: 'text-white/85',
  },
};

/** Carrousel type Meta One : un plan à la fois, styles distincts par offre. */
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
  const theme = PLAN_THEME[plan.id];
  const ThemeIcon = theme.Icon;
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
  const savings = yearlySavingsUsd(plan.id);

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + plans.length) % plans.length);
  };

  const darkShell = variant === 'dark';

  return (
    <div className={cn('w-full', className)}>
      {(plan.priceMonthlyUsd > 0 || compact) && (
        <div className={cn('flex justify-center', compact ? 'mb-3' : 'mb-5')}>
          <div
            className={cn(
              'inline-flex rounded-full p-1 text-xs font-semibold',
              darkShell ? 'bg-white/10' : 'bg-[#eef3f9]'
            )}
          >
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={cn(
                'rounded-full px-4 py-2 transition',
                cycle === 'monthly'
                  ? darkShell
                    ? 'bg-[#2bb673] text-white'
                    : 'bg-[#0b3b78] text-white'
                  : darkShell
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
                  ? darkShell
                    ? 'bg-[#2bb673] text-white'
                    : 'bg-[#0b3b78] text-white'
                  : darkShell
                    ? 'text-white/65'
                    : 'text-[#5c7188]'
              )}
            >
              Annuel
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  cycle === 'yearly'
                    ? 'bg-white/20 text-white'
                    : darkShell
                      ? 'bg-[#2bb673]/25 text-[#6ce0a0]'
                      : 'bg-[#e8f8ef] text-[#178c52]'
                )}
              >
                −2 mois
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
            darkShell
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
            darkShell
              ? 'border-white/20 bg-[#0b2f63]/95 text-white hover:bg-[#0d3a75]'
              : 'border-[#d7e3f0] bg-white/95 text-[#0b3b78] hover:bg-[#f5f8fc]'
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className={cn(
            'w-full overflow-hidden rounded-3xl border transition-colors',
            compact ? 'px-4 py-4 sm:px-8 sm:py-7' : 'px-5 py-5 sm:px-10 sm:py-8',
            variant === 'dark' && plan.id !== 'premium'
              ? 'border-white/15 bg-white/[0.07] backdrop-blur-md'
              : theme.card
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
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl',
                    plan.id === 'premium' ? 'bg-white/10' : 'bg-white shadow-sm ring-1 ring-black/5'
                  )}
                >
                  <ThemeIcon
                    className={cn('h-4 w-4', variant === 'dark' && plan.id !== 'premium' ? 'text-[#6ce0a0]' : theme.accent)}
                    strokeWidth={1.75}
                  />
                </span>
                <p
                  className={cn(
                    'text-xs font-semibold uppercase tracking-[0.2em]',
                    variant === 'dark' && plan.id !== 'premium' ? 'text-[#6ce0a0]' : theme.accent
                  )}
                >
                  {plan.name}
                </p>
              </div>
              <h3
                className={cn(
                  'mt-2 font-semibold tracking-tight',
                  compact ? 'text-lg sm:text-2xl' : 'text-2xl',
                  variant === 'dark' && plan.id !== 'premium' ? 'text-white' : theme.title
                )}
              >
                {plan.description}
              </h3>
            </div>
            {isCurrent ? (
              <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-semibold', theme.badge)}>
                Actuel
              </span>
            ) : plan.id === 'essentiel' ? (
              <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-semibold', theme.badge)}>
                Populaire
              </span>
            ) : plan.id === 'premium' ? (
              <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-semibold', theme.badge)}>
                Pro
              </span>
            ) : null}
          </div>

          <div className={cn('flex items-end gap-2', compact ? 'mt-4' : 'mt-7')}>
            {cycle === 'yearly' && savings ? (
              <span
                className={cn(
                  'mb-2 text-sm line-through opacity-50',
                  variant === 'dark' && plan.id !== 'premium' ? 'text-white' : theme.muted
                )}
              >
                ${savings.fullYearUsd}
              </span>
            ) : null}
            <span
              className={cn(
                'font-semibold tracking-tight',
                compact ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl',
                variant === 'dark' && plan.id !== 'premium' ? 'text-white' : theme.price
              )}
            >
              ${price}
            </span>
            <span
              className={cn(
                'mb-1.5 text-sm',
                variant === 'dark' && plan.id !== 'premium' ? 'text-white/55' : theme.muted
              )}
            >
              {priceSuffix}
            </span>
          </div>

          {cycle === 'yearly' && savings ? (
            <p
              className={cn(
                'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                plan.id === 'premium' ? 'bg-[#c9a227]/20 text-[#f0d78c]' : 'bg-[#e8f8ef] text-[#178c52]'
              )}
            >
              Économisez ${savings.savedUsd} · {savings.monthsFree} mois offerts
            </p>
          ) : (
            <p
              className={cn(
                'mt-1.5 text-sm',
                variant === 'dark' && plan.id !== 'premium' ? 'text-white/65' : theme.muted
              )}
            >
              Commission {plan.commission}&nbsp;% sur chaque transaction validée.
            </p>
          )}

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
                  variant === 'dark' && plan.id !== 'premium' ? 'text-white/85' : theme.feature
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                    theme.check
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
                ? cn(
                    'w-7',
                    p.id === 'premium' ? 'bg-[#c9a227]' : p.id === 'essentiel' ? 'bg-[#0b3b78]' : 'bg-[#2bb673]'
                  )
                : cn('w-2', darkShell ? 'bg-white/30' : 'bg-[#c5d4e4]')
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'mt-3 text-center text-xs',
          darkShell ? 'text-white/45' : 'text-[#8a9bb0]'
        )}
      >
        Glissez ou cliquez pour comparer les plans
      </p>
    </div>
  );
}
