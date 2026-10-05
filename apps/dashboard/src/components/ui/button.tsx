import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] text-sm font-bold transition-[background-color,border-color,transform,box-shadow,filter] duration-200 ease-[var(--ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--on-primary)] shadow-[var(--shadow-primary)] hover:bg-[var(--primary-hover)]",
        accent:
          "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm hover:brightness-105",
        secondary:
          "bg-[var(--tint)] text-[var(--text)] hover:bg-[var(--border)]",
        outline:
          "border border-[var(--border)] bg-transparent hover:bg-[var(--tint)]",
        ghost: "hover:bg-[var(--tint)] text-[var(--text-2)] hover:text-[var(--text)]",
        destructive: "bg-[var(--error)] text-white hover:brightness-105",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-[var(--r-sm)] px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
