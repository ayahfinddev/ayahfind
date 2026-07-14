"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  "aria-label": string;
}

/**
 * Generic toggle-group (segmented control) — formalizes the `.af-segment`
 * CSS utility as a component. Distinct from `Tabs`: this switches a mode,
 * it doesn't switch which content panel is shown.
 */
export function Segment<T extends string>({
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentProps<T>) {
  return (
    <div role="radiogroup" className={cn("flex gap-1.5", className)} {...props}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "af-segment",
            value === option.value ? "af-segment-active" : "af-segment-inactive"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
