import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Check } from 'lucide-react';
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
  renderAction?: (plan: PlanDefinition, cycle: BillingCycle) => ReactNode;
  variant?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
  initialPlanId?: PlanId;
};

type PlanMarkProps = { className?: string };

/** Marque géométrique — plan Basique (bouclier simple). */
function MarkBasique({ className }: PlanMarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3.25 19.25 6.4v5.35c0 4.55-3.05 7.95-7.25 9.15-4.2-1.2-7.25-4.6-7.25-9.15V6.4L12 3.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marque géométrique — plan Essentiel (bouclier + barre escrow). */
function MarkEssentiel({ className }: PlanMarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3.25 19.25 6.4v5.35c0 4.55-3.05 7.95-7.25 9.15-4.2-1.2-7.25-4.6-7.25-9.15V6.4L12 3.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 12h7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Marque géométrique — plan Premium (bouclier + coche). */
function MarkPremium({ className }: PlanMarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3.25 19.25 6.4v5.35c0 4.55-3.05 7.95-7.25 9.15-4.2-1.2-7.25-4.6-7.25-9.15V6.4L12 3.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 12.1 2.2 2.2 4.6-4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PLAN_MARK: Record<PlanId, (p: PlanMarkProps) => ReactElement> = {
  basique: MarkBasique,
  essentiel: MarkEssentiel,
  premium: MarkPremium,
};

const PLAN_THEME: Record<
  PlanId,
  {
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

/** Carrousel type Meta One : balayage, styles distincts par offre. */
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
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lockAxis = useRef<'x' | 'y' | null>(null);
  const dragXRef = useRef(0);
  const draggingRef = useRef(false);

  const cycle = controlledCycle ?? internalCycle;
  const setCycle = (c: BillingCycle) => {
    onBillingCycleChange?.(c);
    if (controlledCycle == null) setInternalCycle(c);
  };

  const plan = plans[index]!;
  const theme = PLAN_THEME[plan.id];
  const PlanMark = PLAN_MARK[plan.id];
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
  const darkShell = variant === 'dark';

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + plans.length) % plans.length);
  };

  const resetDrag = () => {
    pointerStart.current = null;
    lockAxis.current = null;
    draggingRef.current = false;
    dragXRef.current = 0;
    setDragging(false);
    setDragX(0);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select, label')) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    lockAxis.current = null;
    draggingRef.current = true;
    dragXRef.current = 0;
    setDragging(true);
    setDragX(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current || !draggingRef.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (!lockAxis.current) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      lockAxis.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (lockAxis.current === 'y') {
        // Laisse le scroll vertical natif
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        resetDrag();
        return;
      }
    }
    if (lockAxis.current !== 'x') return;
    e.preventDefault();
    const next = Math.max(-120, Math.min(120, dx));
    dragXRef.current = next;
    setDragX(next);
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = dragXRef.current;
    const axis = lockAxis.current;
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (axis === 'x') {
      if (dx > 48) go(-1);
      else if (dx < -48) go(1);
    }
    resetDrag();
  };

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
        <div
          className={cn(
            'w-full select-none overflow-hidden rounded-3xl border transition-colors touch-pan-y',
            compact ? 'px-4 py-4 sm:px-8 sm:py-7' : 'px-5 py-5 sm:px-10 sm:py-8',
            variant === 'dark' && !onDark
              ? 'border-white/15 bg-white/[0.07] backdrop-blur-md'
              : theme.card,
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          style={{
            transform: dragX ? `translate3d(${dragX * 0.28}px, 0, 0)` : undefined,
            transition: dragging ? 'none' : 'transform 220ms ease',
            touchAction: 'pan-y',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    theme.iconWrap
                  )}
                >
                  <PlanMark
                    className={cn(
                      'h-[18px] w-[18px]',
                      variant === 'dark' && !onDark ? 'text-[#6ce0a0]' : theme.accent
                    )}
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
        Balayez pour comparer les plans
      </p>
    </div>
  );
}
