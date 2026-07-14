"use client";

import { type ReactNode } from "react";
import { IconButton } from "./IconButton";
import { cn } from "@/lib/utils";

export interface ActionBarItem {
  key: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

export interface ActionBarProps {
  items: ActionBarItem[];
  className?: string;
}

/**
 * Generic row of icon actions (bookmark/copy/share/play, etc.) — works for
 * any content row, not just Quran verses, so a future Hadith card gets the
 * same action affordances for free.
 */
export function ActionBar({ items, className }: ActionBarProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {items.map((item) => (
        <IconButton
          key={item.key}
          aria-label={item.label}
          active={item.active}
          disabled={item.disabled}
          onClick={item.onClick}
          size="sm"
        >
          {item.icon}
        </IconButton>
      ))}
    </div>
  );
}
