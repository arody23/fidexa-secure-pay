import { cn } from '@/lib/utils';

type IconProps = { className?: string; title?: string };

function NetworkLogo({ src, className, title }: IconProps & { src: string }) {
  return <img src={src} alt={title} className={cn('shrink-0 object-contain', className)} loading="lazy" />;
}

export function OrangeMoneyIcon({ className, title = 'Orange Money' }: IconProps) {
  return <NetworkLogo src="/assets/mobile-money/orange-money.svg" className={className} title={title} />;
}

export function MtnMoneyIcon({ className, title = 'MTN MoMo' }: IconProps) {
  return <NetworkLogo src="/assets/mobile-money/mtn-momo.svg" className={className} title={title} />;
}

export function AirtelMoneyIcon({ className, title = 'Airtel Money' }: IconProps) {
  return <NetworkLogo src="/assets/mobile-money/airtel.svg" className={className} title={title} />;
}

export function MpesaIcon({ className, title = 'M-Pesa' }: IconProps) {
  return <NetworkLogo src="/assets/mobile-money/mpesa.svg" className={className} title={title} />;
}

export const MOBILE_MONEY_NETWORKS = [
  { id: 'orange', name: 'Orange Money', Icon: OrangeMoneyIcon },
  { id: 'mtn', name: 'MTN MoMo', Icon: MtnMoneyIcon },
  { id: 'airtel', name: 'Airtel Money', Icon: AirtelMoneyIcon },
  { id: 'mpesa', name: 'M-Pesa', Icon: MpesaIcon },
] as const;

export function MobileMoneyRow({
  className,
  variant = 'row',
}: {
  className?: string;
  /** row = inline chips · grid = maquette landing-02 */
  variant?: 'row' | 'grid';
}) {
  if (variant === 'grid') {
    return (
      <ul className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5', className)}>
        {MOBILE_MONEY_NETWORKS.map(({ id, name, Icon }) => (
          <li
            key={id}
            className="flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-3 py-6 shadow-sm"
          >
            <Icon className="h-16 w-full max-w-32 sm:h-20" />
            <span className="mt-4 text-center text-xs font-semibold text-[#1A3A5C] sm:text-sm">{name}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn('flex flex-wrap items-center justify-center gap-3 sm:gap-4', className)}>
      {MOBILE_MONEY_NETWORKS.map(({ id, name, Icon }) => (
        <li
          key={id}
          className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-2.5 py-1.5 shadow-sm"
          title={name}
        >
          <Icon className="h-8 w-8" />
          <span className="text-xs font-medium text-foreground/80 sm:text-sm">{name}</span>
        </li>
      ))}
    </ul>
  );
}
