import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";

interface LogoProps {
  variant?: "default" | "white";
  showSlogan?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ variant = "default", showSlogan = false, size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: {
      icon: "w-8 h-8",
      lock: "w-3 h-3",
      text: "text-xl",
      slogan: "text-xs"
    },
    md: {
      icon: "w-10 h-10",
      lock: "w-4 h-4",
      text: "text-2xl",
      slogan: "text-sm"
    },
    lg: {
      icon: "w-14 h-14",
      lock: "w-5 h-5",
      text: "text-4xl",
      slogan: "text-base"
    }
  };

  const classes = sizeClasses[size];

  return (
    <Link to="/" className="flex items-center gap-3">
      <motion.div
        className="flex items-center gap-2"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Shield Icon with Lock */}
        <div className="relative">
          <Shield 
            className={`${classes.icon} ${
              variant === "white" ? "text-white" : "text-primary"
            }`}
            strokeWidth={2}
            fill={variant === "white" ? "rgba(255,255,255,0.1)" : "hsl(var(--primary) / 0.1)"}
          />
          <Lock 
            className={`${classes.lock} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              variant === "white" ? "text-secondary" : "text-secondary"
            }`}
            strokeWidth={2.5}
          />
        </div>
        
        {/* Brand Name */}
        <div className="flex flex-col">
          <span
            className={`font-display ${classes.text} font-extrabold tracking-tight ${
              variant === "white" ? "text-white" : "text-primary"
            }`}
          >
            FIDEXA
          </span>
          {showSlogan && (
            <span
              className={`${classes.slogan} ${
                variant === "white" ? "text-white/80" : "text-muted-foreground"
              }`}
            >
              Payer et livrer en toute sérénité.
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
};

export default Logo;
