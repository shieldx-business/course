import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-sm border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
