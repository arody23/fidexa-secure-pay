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

export function MoovMoneyIcon({ className, title = 'Moov Money' }: IconProps) {
  return <NetworkLogo src="/assets/mobile-money/moov-money.svg" className={className} title={title} />;
}

export function WaveIcon({ className, title = 'Wave' }: IconProps) {
  return <NetworkLogo src="/assets/mobile-money/wave.svg" className={className} title={title} />;
}

export function VodafoneCashIcon({ className, title = 'Vodafone Cash' }: IconProps) {
  return <NetworkLogo src="/assets/mobile-money/vodafone-cash.svg" className={className} title={title} />;
}

export const MOBILE_MONEY_NETWORKS = [
  { id: 'orange', name: 'Orange Money', Icon: OrangeMoneyIcon, countries: 'CI · SN · CM · CD' },
  { id: 'mtn', name: 'MTN MoMo', Icon: MtnMoneyIcon, countries: 'CI · BJ · CG · CM' },
  { id: 'airtel', name: 'Airtel Money', Icon: AirtelMoneyIcon, countries: 'CD · CG · GA' },
  { id: 'mpesa', name: 'M-Pesa', Icon: MpesaIcon, countries: 'CD' },
  { id: 'moov', name: 'Moov Money', Icon: MoovMoneyIcon, countries: 'CI · BJ' },
  { id: 'wave', name: 'Wave', Icon: WaveIcon, countries: 'CI · SN · BJ' },
  { id: 'vodafone', name: 'Vodafone Cash', Icon: VodafoneCashIcon, countries: 'CD' },
] as const;

export function MobileMoneyRow({
  className,
  variant = 'row',
}: {
  className?: string;
  /** row = inline chips · grid = cards · marquee = défilement continu */
  variant?: 'row' | 'grid' | 'marquee';
}) {
  if (variant === 'marquee') {
    const loop = [...MOBILE_MONEY_NETWORKS, ...MOBILE_MONEY_NETWORKS];
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#F5F7FA] to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#F5F7FA] to-transparent sm:w-24" />
        <div className="fidexa-marquee flex w-max gap-4 py-2">
          {loop.map(({ id, name, Icon, countries }, index) => (
            <div
              key={`${id}-${index}`}
              className="flex w-[168px] shrink-0 flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-4 py-5 shadow-sm sm:w-[190px]"
            >
              <div className="flex h-12 w-full max-w-[140px] items-center justify-center">
                <Icon className="h-10 w-full max-w-[132px]" />
              </div>
              <span className="mt-3 text-center text-xs font-semibold text-[#1A3A5C] sm:text-sm">{name}</span>
              <span className="mt-1 text-center text-[10px] text-[#7a90a5]">{countries}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <ul className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5', className)}>
        {MOBILE_MONEY_NETWORKS.map(({ id, name, Icon, countries }) => (
          <li
            key={id}
            className="flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-3 py-6 shadow-sm"
          >
            <div className="flex h-16 w-full max-w-32 items-center justify-center">
              <Icon className="h-12 w-full sm:h-14" />
            </div>
            <span className="mt-4 text-center text-xs font-semibold text-[#1A3A5C] sm:text-sm">{name}</span>
            <span className="mt-1 text-center text-[10px] text-[#7a90a5]">{countries}</span>
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
