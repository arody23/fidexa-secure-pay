import { cn } from '@/lib/utils';

type FidexaMarkProps = {
  className?: string;
  /** Light mark on dark backgrounds */
  inverse?: boolean;
};

/**
 * Brandkit mark (image-to-code from docs/brand masters):
 * - Navy shield outline
 * - Mint checkmark completing bottom-right (escrow / verified path)
 * - Navy padlock + white keyhole
 * Source: fidexapay-logo-mark-master / logo-system board
 */
export function FidexaMark({ className, inverse = false }: FidexaMarkProps) {
  const navy = inverse ? '#F5F7FA' : '#1A3A5C';
  const mint = '#2BB673';
  const keyhole = inverse ? '#0B1220' : '#FFFFFF';

  return (
    <svg
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* Shield outline — open at bottom-right where check attaches */}
      <path
        d="M32 6C32 6 14 12.5 14 12.5V34.5C14 46.5 20.8 56.8 32 62"
        stroke={navy}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 6C32 6 50 12.5 50 12.5V28"
        stroke={navy}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Mint check / escrow path = bottom-right of shield */}
      <path
        d="M26 48.5L34.5 57L52 32"
        stroke={mint}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Padlock body */}
      <rect x="24" y="30" width="16" height="14" rx="3.5" fill={navy} />
      {/* Shackle */}
      <path
        d="M27.5 30V26.2C27.5 23.3 29.6 21 32 21C34.4 21 36.5 23.3 36.5 26.2V30"
        stroke={navy}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle cx="32" cy="36.2" r="2.1" fill={keyhole} />
      <rect x="31.15" y="37.4" width="1.7" height="3.2" rx="0.7" fill={keyhole} />
    </svg>
  );
}

export default FidexaMark;
