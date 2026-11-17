import { cn } from '@/lib/utils';

/** Badge type Meta / Instagram — pastille bleue + coche blanche */
export function VerifiedBadge({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const check = size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-[#1d9bf0] shadow-[0_0_0_1.5px_#fff]',
        dim,
        className
      )}
      aria-label="Profil vérifié"
      title="Profil vérifié"
    >
      <svg
        viewBox="0 0 12 12"
        className={cn(check, 'text-white')}
        fill="none"
        aria-hidden
      >
        <path
          d="M2.5 6.2 4.8 8.5 9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
