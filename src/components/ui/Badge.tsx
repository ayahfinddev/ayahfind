import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  size?: BadgeSize;
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

/**
 * Generic pill shape/padding base. Color is left to the caller (via
 * className or inline style) so RiwayahBadge/ConfidenceBadge keep their own
 * per-instance color logic while sharing this shape.
 */
export function Badge({ size = "sm", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium leading-none",
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
