import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const Logo = ({ variant = "default" }: { variant?: "default" | "white" }) => {
  return (
    <Link to="/" className="flex items-center gap-2">
      <motion.div
        className="flex items-center"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <span
          className={`font-display text-2xl font-extrabold tracking-tight ${
            variant === "white" ? "text-background" : "text-foreground"
          }`}
        >
          FIDE
        </span>
        <span className="font-display text-2xl font-extrabold tracking-tight text-primary">
          XA
        </span>
      </motion.div>
    </Link>
  );
};

export default Logo;
