import { cn } from '@/lib/utils';

/** Marque escrow Fidexa — coffre/verrou fin, pas un bouclier générique. */
export default function EscrowMark({
  className,
  strokeWidth = 1.6,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect
        x="4.25"
        y="10"
        width="15.5"
        height="10"
        rx="2.25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        d="M8 10V7.75C8 5.679 9.679 4 11.75 4h.5C14.321 4 16 5.679 16 7.75V10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle cx="12" cy="14.25" r="1.15" fill="currentColor" />
      <path
        d="M12 15.4v2.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
