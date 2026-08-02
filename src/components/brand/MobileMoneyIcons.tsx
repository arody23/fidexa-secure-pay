import { cn } from '@/lib/utils';

type IconProps = { className?: string; title?: string };

/** Official-color SVG marks for Mobile Money networks (simplified brand marks). */

export function OrangeMoneyIcon({ className, title = 'Orange Money' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <rect width="40" height="40" rx="10" fill="#FF7900" />
      <circle cx="20" cy="20" r="9" fill="#fff" />
      <path
        d="M20 12.5c-4.1 0-7.5 3.4-7.5 7.5S15.9 27.5 20 27.5 27.5 24.1 27.5 20 24.1 12.5 20 12.5zm0 12.2c-2.6 0-4.7-2.1-4.7-4.7s2.1-4.7 4.7-4.7 4.7 2.1 4.7 4.7-2.1 4.7-4.7 4.7z"
        fill="#FF7900"
      />
    </svg>
  );
}

export function MtnMoneyIcon({ className, title = 'MTN MoMo' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <rect width="40" height="40" rx="10" fill="#FFCC00" />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="11"
        fill="#000"
      >
        MTN
      </text>
    </svg>
  );
}

export function AirtelMoneyIcon({ className, title = 'Airtel Money' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <rect width="40" height="40" rx="10" fill="#ED1C24" />
      <path
        d="M12 28L20 10l8 18h-3.2l-1.4-3.2h-6.8L15.2 28H12zm6.2-5.8h3.6L20 15.8l-1.8 6.4z"
        fill="#fff"
      />
    </svg>
  );
}

export function WaveIcon({ className, title = 'Wave' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <rect width="40" height="40" rx="10" fill="#1DC8FF" />
      <path
        d="M8 22c2.5-4 5.5-6 9-6s6.5 2 9 6c2.2-3.2 5-5 8-5v4c-2.2 0-4.2 1.4-6 4H14c-1.8-2.6-3.8-4-6-4v-4c1.2 0 2.2.2 3 .6z"
        fill="#fff"
      />
    </svg>
  );
}

export function MoovMoneyIcon({ className, title = 'Moov Money' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <rect width="40" height="40" rx="10" fill="#0066B3" />
      <path d="M10 26V14h4.2l3.3 8.2L21 14h4.2v12H22V19.2L18.8 26h-2.6L13.2 19.2V26H10z" fill="#fff" />
      <circle cx="30" cy="14.5" r="2.2" fill="#F7A600" />
    </svg>
  );
}

export function MpesaIcon({ className, title = 'M-Pesa' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <rect width="40" height="40" rx="10" fill="#4CAF50" />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="9"
        fill="#fff"
      >
        M-PESA
      </text>
    </svg>
  );
}

export const MOBILE_MONEY_NETWORKS = [
  { id: 'orange', name: 'Orange Money', Icon: OrangeMoneyIcon },
  { id: 'mtn', name: 'MTN MoMo', Icon: MtnMoneyIcon },
  { id: 'airtel', name: 'Airtel Money', Icon: AirtelMoneyIcon },
  { id: 'wave', name: 'Wave', Icon: WaveIcon },
  { id: 'moov', name: 'Moov Money', Icon: MoovMoneyIcon },
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
      <ul className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6', className)}>
        {MOBILE_MONEY_NETWORKS.map(({ id, name, Icon }) => (
          <li
            key={id}
            className="flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-3 py-6 shadow-sm"
          >
            <Icon className="h-14 w-14 sm:h-16 sm:w-16" />
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
