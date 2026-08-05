import type { ReactNode } from 'react';

/** Titre section + trait mint — ref maquettes 02–07 */
export function LandingSectionTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-2xl font-semibold tracking-tight text-[#1A3A5C] sm:text-3xl md:text-4xl">
        {children}
      </h2>
      <span className="mx-auto mt-3 block h-1 w-12 rounded-full bg-[#2BB673]" aria-hidden />
    </div>
  );
}
