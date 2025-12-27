import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export const StarRating = ({
  rating,
  maxRating = 5,
  size = "md",
  showValue = false,
  className,
}: StarRatingProps) => {
  const sizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            sizes[size],
            index < Math.floor(rating)
              ? "text-warning fill-warning"
              : index < rating
              ? "text-warning fill-warning/50"
              : "text-muted-foreground"
          )}
        />
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;
