import { cn } from '@/lib/utils';

/** Badge vérifié style Meta / Instagram (pastille bleue + coche) */
export function VerifiedBadge({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-[1.375rem] w-[1.375rem]' : 'h-5 w-5';

  return (
    <svg
      viewBox="0 0 40 40"
      className={cn(dim, 'shrink-0', className)}
      aria-label="Profil vérifié"
      role="img"
    >
      <circle cx="20" cy="20" r="20" fill="#1D9BF0" />
      <path
        d="M11.2 20.4 17 26.2 28.8 14.4"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
