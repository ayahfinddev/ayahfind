"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ExpandablePanelProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Full control over the trigger button's own classes — a reader-inline
   * "link" trigger and an action-row "pill" trigger need different shapes,
   * so this primitive only owns the panel below, not the trigger's layout. */
  triggerClassName?: string;
  /** Off for compact pill-style triggers that already carry their own icon. */
  showChevron?: boolean;
  className?: string;
  panelClassName?: string;
}

/**
 * Generic collapse/expand shell at the `surface-elevated` level — generalizes
 * the shared pattern behind TafsirPanel and QiraatPanel so future panels
 * (Asbab al-Nuzul, Hadith references) reuse the same shell. The trigger's
 * own shape/width is entirely up to the caller; this primitive only
 * standardizes the expanded panel underneath it.
 */
export function ExpandablePanel({
  trigger,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  triggerClassName,
  showChevron = true,
  className,
  panelClassName,
}: ExpandablePanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const panelId = useId();

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 ease-out hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          triggerClassName
        )}
      >
        {trigger}
        {showChevron && (
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out", isOpen && "rotate-180")}
          />
        )}
      </button>
      {isOpen && (
        <div
          id={panelId}
          className={cn(
            "mt-3 w-full rounded-xl border border-border-strong bg-surface-elevated px-4 py-3.5 shadow-sm",
            panelClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
