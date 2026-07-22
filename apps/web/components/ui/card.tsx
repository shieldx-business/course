import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  highlighted?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, highlighted, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg bg-white border",
          highlighted
            ? "border-2 border-accent-500 shadow-card"
            : "border-neutral-300",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
