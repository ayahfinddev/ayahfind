"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  onValueChange?: (id: string) => void;
  className?: string;
}

/**
 * Generic content-switching tabs — distinct from `Segment` (a mode toggle).
 * Formalizes the ad hoc tab switcher inside TafsirPanel so future panels
 * (Qira'at, Asbab al-Nuzul) get tabs for free.
 */
export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(items[0]?.id);
  const isControlled = value !== undefined;
  const activeId = isControlled ? value : internalValue;
  const groupId = useId();

  const select = (id: string) => {
    if (!isControlled) setInternalValue(id);
    onValueChange?.(id);
  };

  const activeItem = items.find((item) => item.id === activeId);

  return (
    <div className={className}>
      <div role="tablist" aria-label="Tabs" className="flex gap-1.5 border-b border-border pb-2">
        {items.map((item) => (
          <button
            key={item.id}
            id={`${groupId}-tab-${item.id}`}
            role="tab"
            type="button"
            aria-selected={activeId === item.id}
            aria-controls={`${groupId}-panel-${item.id}`}
            onClick={() => select(item.id)}
            className={cn(
              "af-segment",
              activeId === item.id ? "af-segment-active" : "af-segment-inactive"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem && (
        <div
          id={`${groupId}-panel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`${groupId}-tab-${activeItem.id}`}
          className="pt-3"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
