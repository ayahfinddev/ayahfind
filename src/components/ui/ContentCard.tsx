"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ContentCardElevation = "surface" | "elevated" | "floating";
export type ContentCardPadding = "sm" | "md" | "lg";

export interface ContentCardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: ContentCardElevation;
  padding?: ContentCardPadding;
  /** The one deliberate "lift on hover" case — e.g. search result cards. */
  interactive?: boolean;
}

const ELEVATION_CLASSES: Record<ContentCardElevation, string> = {
  surface: "bg-surface border border-border shadow-xs",
  elevated: "bg-surface-elevated border border-border-strong shadow-sm",
  floating: "bg-surface-floating border border-border-strong shadow-md",
};

const PADDING_CLASSES: Record<ContentCardPadding, string> = {
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-6 sm:p-8",
};

/**
 * General list/result card — the one shared "elevated surface" shell that
 * replaces the ad hoc bg-white + shadow-[...] recipes scattered across the
 * app. See docs/DESIGN_SYSTEM.md's surface hierarchy.
 */
export const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(
  ({ elevation = "surface", padding = "md", interactive, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl transition-shadow duration-150 ease-out",
          ELEVATION_CLASSES[elevation],
          PADDING_CLASSES[padding],
          interactive && "hover:-translate-y-0.5 hover:shadow-md",
          className
        )}
        {...props}
      />
    );
  }
);
ContentCard.displayName = "ContentCard";
