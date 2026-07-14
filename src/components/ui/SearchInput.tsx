"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Rendered right of the input — e.g. a voice-search trigger or submit button. */
  rightSlot?: ReactNode;
  containerClassName?: string;
}

/**
 * Generic search input: icon-left, optional right-side slot for a voice
 * trigger or submit button. Extracted from AISearchBar so any future search
 * surface (Hadith search, etc.) reuses the same shell.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ rightSlot, containerClassName, className, ...props }, ref) => {
    return (
      <div
        className={cn(
          "search-glow flex h-12 items-center gap-2 rounded-xl border border-border bg-surface px-4 shadow-xs transition-shadow duration-150 ease-out",
          containerClassName
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
        <input
          ref={ref}
          type="text"
          className={cn(
            "h-full flex-1 bg-transparent text-sm text-text placeholder:text-text-tertiary focus:outline-none",
            className
          )}
          {...props}
        />
        {rightSlot}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
