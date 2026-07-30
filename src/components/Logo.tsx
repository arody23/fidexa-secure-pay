import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface LogoProps {
  variant?: "default" | "white";
  size?: "sm" | "md" | "lg";
  /** Destination. Default: home (session stays active). */
  to?: string;
}

export const Logo = ({ size = "md", to = "/" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-10 sm:h-12",
    md: "h-14 sm:h-20",
    lg: "h-20 sm:h-24",
  };

  return (
    <Link to={to} className="flex items-center" aria-label="FidexaPay — Accueil">
      <motion.img
        src="/assets/logo/Logo.png"
        alt="FidexaPay"
        className={`${sizeClasses[size]} w-auto max-w-[160px] object-contain`}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2 }}
      />
    </Link>
  );
};

export default Logo;
