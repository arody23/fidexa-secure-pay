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
    savings: string;
    iconWrap: string;
    darkOnCard: boolean;
  }
> = {
  basique: {
    Icon: Leaf,
    accent: 'text-[#3d7a5a]',
    badge: 'bg-[#eef6f1] text-[#3d7a5a]',
    card: 'border-[#d8e5de] bg-gradient-to-b from-[#f7faf8] to-white',
    check: 'bg-[#5a9a78]',
    price: 'text-slate-900',
    muted: 'text-slate-500',
    title: 'text-slate-900',
    feature: 'text-slate-600',
    savings: 'bg-[#eef6f1] text-[#3d7a5a]',
    iconWrap: 'bg-white shadow-sm ring-1 ring-black/5',
    darkOnCard: false,
  },
  essentiel: {
    Icon: Sparkles,
    accent: 'text-[#8eb6e8]',
    badge: 'bg-white/15 text-white',
    card: 'border-[#0b3b78]/40 bg-gradient-to-br from-[#0b2f63] via-[#0b3b78] to-[#082848] text-white shadow-[0_24px_60px_-28px_rgba(11,47,99,.55)]',
    check: 'bg-[#2bb673]',
    price: 'text-white',
    muted: 'text-white/65',
    title: 'text-white',
    feature: 'text-white/85',
    savings: 'bg-[#2bb673]/20 text-[#9de8c0]',
    iconWrap: 'bg-white/10',
    darkOnCard: true,
  },
  premium: {
    Icon: Crown,
    accent: 'text-[#9de8c0]',
    badge: 'bg-[#145c3a] text-[#d8f5e6]',
    card: 'border-[#1a5c3c]/35 bg-gradient-to-br from-[#145c3a] via-[#1a6b45] to-[#0f3d28] text-white shadow-[0_24px_60px_-24px_rgba(20,92,58,.5)]',
    check: 'bg-[#6ce0a0]',
    price: 'text-white',
    muted: 'text-white/70',
    title: 'text-white',
    feature: 'text-white/90',
    savings: 'bg-white/10 text-[#d8f5e6]',
    iconWrap: 'bg-white/10',
    darkOnCard: true,
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
  const onDark = theme.darkOnCard;

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
              darkShell ? 'bg-white/10' : 'bg-slate-200/70'
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
                    : 'bg-slate-900 text-white'
                  : darkShell
                    ? 'text-white/65'
                    : 'text-slate-500'
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
                    : 'bg-slate-900 text-white'
                  : darkShell
                    ? 'text-white/65'
                    : 'text-slate-500'
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
                      : 'bg-emerald-50 text-emerald-700'
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
              : 'border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-50'
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
              : 'border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-50'
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className={cn(
            'w-full overflow-hidden rounded-3xl border transition-colors',
            compact ? 'px-4 py-4 sm:px-8 sm:py-7' : 'px-5 py-5 sm:px-10 sm:py-8',
            variant === 'dark' && !onDark
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
                    theme.iconWrap
                  )}
                >
                  <ThemeIcon
                    className={cn(
                      'h-4 w-4',
                      variant === 'dark' && !onDark ? 'text-[#6ce0a0]' : theme.accent
                    )}
                    strokeWidth={1.75}
                  />
                </span>
                <p
                  className={cn(
                    'text-xs font-semibold uppercase tracking-[0.2em]',
                    variant === 'dark' && !onDark ? 'text-[#6ce0a0]' : theme.accent
                  )}
                >
                  {plan.name}
                </p>
              </div>
              <h3
                className={cn(
                  'mt-2 font-semibold tracking-tight',
                  compact ? 'text-lg sm:text-2xl' : 'text-2xl',
                  variant === 'dark' && !onDark ? 'text-white' : theme.title
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
                  variant === 'dark' && !onDark ? 'text-white' : theme.muted
                )}
              >
                ${savings.fullYearUsd}
              </span>
            ) : null}
            <span
              className={cn(
                'font-semibold tracking-tight',
                compact ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl',
                variant === 'dark' && !onDark ? 'text-white' : theme.price
              )}
            >
              ${price}
            </span>
            <span
              className={cn(
                'mb-1.5 text-sm',
                variant === 'dark' && !onDark ? 'text-white/55' : theme.muted
              )}
            >
              {priceSuffix}
            </span>
          </div>

          {cycle === 'yearly' && savings ? (
            <p className={cn('mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', theme.savings)}>
              Économisez ${savings.savedUsd} · {savings.monthsFree} mois offerts
            </p>
          ) : (
            <p
              className={cn(
                'mt-1.5 text-sm',
                variant === 'dark' && !onDark ? 'text-white/65' : theme.muted
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
                  variant === 'dark' && !onDark ? 'text-white/85' : theme.feature
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                    theme.check
                  )}
                >
                  <Check
                    className={cn('h-3 w-3', onDark ? 'text-[#0a2418]' : 'text-white')}
                    strokeWidth={3}
                  />
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
                    p.id === 'premium'
                      ? 'bg-[#1a6b45]'
                      : p.id === 'essentiel'
                        ? 'bg-[#0b3b78]'
                        : 'bg-[#5a9a78]'
                  )
                : cn('w-2', darkShell ? 'bg-white/30' : 'bg-slate-300')
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'mt-3 text-center text-xs',
          darkShell ? 'text-white/45' : 'text-slate-400'
        )}
      >
        Glissez ou cliquez pour comparer les plans
      </p>
    </div>
  );
}
