"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  /** Visually marks the button as toggled on (e.g. bookmarked, playing). */
  active?: boolean;
  "aria-label": string;
}

// `md`/`lg` hit 44px (WCAG AAA). `sm` is 36px — still clears the WCAG AA
// minimum (24px) with margin — reserved for dense rows (verse/result action
// bars, reader top-bar toolbar) where a true 44px per icon wouldn't fit.
const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-11 w-11 [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-11 w-11 [&_svg]:h-6 [&_svg]:w-6",
};

/**
 * Generic icon-only button. Formalizes the `.af-icon-btn` CSS utility as a
 * component so active state, sizing, and touch targets stay consistent.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = "md", active, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type ?? "button"}
        className={cn(
          "af-icon-btn inline-flex items-center justify-center rounded-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          SIZE_CLASSES[size],
          active && "bg-accent-surface text-primary-hover",
          className
        )}
        aria-pressed={active}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";
