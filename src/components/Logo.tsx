import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface LogoProps {
  variant?: "default" | "white";
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ variant = "default", size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-12",
    md: "h-20",
    lg: "h-24"
  };

  return (
    <Link to="/" className="flex items-center">
      <motion.img
        src="/assets/logo/Logo.png"
        alt="FidexaPay"
        className={`${sizeClasses[size]} w-auto object-contain`}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      />
    </Link>
  );
};

export default Logo;
