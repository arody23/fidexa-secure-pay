import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'default' | 'white';
  size?: 'sm' | 'md' | 'lg';
  /** Destination. Default: home (session stays active). */
  to?: string;
  className?: string;
  /** Horizontal lockup (default) vs mark only */
  wordmark?: boolean;
}

const sizeMap = {
  sm: { mark: 'h-8 w-8 sm:h-9 sm:w-9', text: 'text-xl sm:text-[1.35rem]' },
  md: { mark: 'h-10 w-10 sm:h-11 sm:w-11', text: 'text-2xl sm:text-[1.65rem]' },
  lg: { mark: 'h-12 w-12 sm:h-14 sm:w-14', text: 'text-3xl sm:text-[2rem]' },
} as const;

/**
 * Marque officielle recadrée depuis l'icône de l'application.
 * Le mot-symbole reste en HTML pour conserver une netteté parfaite à toute taille.
 */
export const Logo = ({
  size = 'md',
  to = '/',
  variant = 'default',
  className,
  wordmark = true,
}: LogoProps) => {
  const s = sizeMap[size];
  const inverse = variant === 'white';

  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="FidexaPay — Accueil">
      <motion.img
        src="/assets/logo/fidexapay-mark.png"
        alt="FidexaPay"
        className={cn(s.mark, 'shrink-0 object-contain')}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      />
      {wordmark && (
        <span
          className={cn(
            'font-semibold leading-none tracking-[-0.045em]',
            s.text,
            inverse ? 'text-white' : 'text-[#153b79]'
          )}
        >
          Fidexa<span className={inverse ? 'text-[#5ee0a0]' : 'text-[#2bb673]'}>Pay</span>
        </span>
      )}
    </Link>
  );
};

export default Logo;
