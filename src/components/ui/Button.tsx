"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-xs",
  secondary: "border border-border-strong bg-surface text-text hover:bg-surface-secondary",
  ghost: "text-text-secondary hover:bg-surface-secondary hover:text-text",
  destructive: "bg-error text-white hover:brightness-95",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-3 text-xs",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-12 rounded-xl px-6 text-base",
};

/**
 * Generic button primitive. One `primary` per view is the convention — see
 * docs/DESIGN_SYSTEM.md's button hierarchy section.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
