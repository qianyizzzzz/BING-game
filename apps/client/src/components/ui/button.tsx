import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "ghost" | "glass";
type ButtonSize = "default" | "sm" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  ghost:
    "text-foreground hover:bg-white/10 hover:text-foreground",
  glass:
    "liquid-glass text-foreground shadow-none"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-9 px-3 text-sm",
  lg: "h-12 px-8 text-base"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      size = "default",
      type = "button",
      variant = "default",
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      type={type}
      {...props}
    />
  )
);

Button.displayName = "Button";
