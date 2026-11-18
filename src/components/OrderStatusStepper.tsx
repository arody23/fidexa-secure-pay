import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { ORDER_STEPS, getStepIndex } from '@/lib/escrowConfig';
import { cn } from '@/lib/utils';

interface OrderStatusStepperProps {
  status: string;
  className?: string;
}

export default function OrderStatusStepper({ status, className }: OrderStatusStepperProps) {
  const currentIndex = getStepIndex(status);
  const isTerminal = status === 'cancelled' || status === 'disputed';
  const isComplete = status === 'validated';

  if (isTerminal) {
    return (
      <div
        className={cn(
          'rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-snug',
          className
        )}
      >
        Commande {status === 'disputed' ? 'en litige' : 'annulée'} — suivi suspendu.
      </div>
    );
  }

  return (
    <div className={cn('min-w-0 space-y-3', className)}>
      {/* Mobile: vertical timeline — Desktop: 4 columns */}
      <div className="flex flex-col gap-3 sm:hidden">
        {ORDER_STEPS.map((step, index) => {
          const done = isComplete ? index <= currentIndex : currentIndex > index;
          const active = !isComplete && currentIndex === index;
          const Icon = done ? CheckCircle2 : active ? Clock : Circle;

          return (
            <div key={step.key} className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                  done && 'border-[#0b3b78] bg-[#0b3b78] text-white',
                  active && !done && 'border-[#0b3b78] bg-[#0b3b78]/10 text-[#0b3b78]',
                  !done && !active && 'border-[#dbe6f2] text-[#8a9bb0]'
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    active || (isComplete && index === currentIndex)
                      ? 'text-[#0b3b78]'
                      : 'text-[#0b2f63]'
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-[#5c7188]">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden grid-cols-4 gap-2 sm:grid">
        {ORDER_STEPS.map((step, index) => {
          const done = isComplete ? index <= currentIndex : currentIndex > index;
          const active = !isComplete && currentIndex === index;
          const Icon = done ? CheckCircle2 : active ? Clock : Circle;

          return (
            <div key={step.key} className="min-w-0 text-center">
              <div
                className={cn(
                  'mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && !done && 'border-primary bg-primary/10 text-primary',
                  !done && !active && 'border-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p
                className={cn(
                  'truncate text-[11px] font-medium',
                  (active || (isComplete && index === currentIndex)) && 'text-primary'
                )}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {isComplete ? (
        <p className="hidden text-center text-sm font-medium text-primary sm:block">
          {ORDER_STEPS[ORDER_STEPS.length - 1].description}
        </p>
      ) : (
        currentIndex >= 0 &&
        currentIndex < ORDER_STEPS.length && (
          <p className="hidden text-center text-sm text-muted-foreground sm:block">
            {ORDER_STEPS[currentIndex].description}
          </p>
        )
      )}
    </div>
  );
}
