import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:pointer-events-none";
    const variants: Record<string, string> = {
      default: "bg-blue-600 text-white hover:bg-blue-500",
      outline: "border border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800",
      ghost: "bg-transparent text-slate-400 hover:bg-slate-800",
      destructive: "bg-red-600 text-white hover:bg-red-500"
    };
    const sizes: Record<string, string> = {
      sm: "px-2 py-1 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {loading ? <span className="animate-pulse mr-2">...</span> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
