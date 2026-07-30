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
      <div className={cn('rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm', className)}>
        Commande {status === 'disputed' ? 'en litige' : 'annulée'} — suivi suspendu.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-4 gap-2">
        {ORDER_STEPS.map((step, index) => {
          const done = isComplete ? index <= currentIndex : currentIndex > index;
          const active = !isComplete && currentIndex === index;
          const Icon = done ? CheckCircle2 : active ? Clock : Circle;

          return (
            <div key={step.key} className="text-center">
              <div
                className={cn(
                  'mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && !done && 'border-primary bg-primary/10 text-primary',
                  !done && !active && 'border-muted text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className={cn('text-xs font-medium', (active || (isComplete && index === currentIndex)) && 'text-primary')}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
      {isComplete ? (
        <p className="text-center text-sm font-medium text-primary">
          {ORDER_STEPS[ORDER_STEPS.length - 1].description}
        </p>
      ) : (
        currentIndex >= 0 &&
        currentIndex < ORDER_STEPS.length && (
          <p className="text-center text-sm text-muted-foreground">
            {ORDER_STEPS[currentIndex].description}
          </p>
        )
      )}
    </div>
  );
}
