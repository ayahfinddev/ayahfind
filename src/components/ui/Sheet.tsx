"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** `bottom` = mobile-style bottom sheet, `center` = desktop-style dialog. */
  position?: "bottom" | "center";
  className?: string;
}

/**
 * Generic `surface-floating` dialog/bottom-sheet shell — radius-lg,
 * shadow-md, backdrop. Used for the Quran navigator panel, the voice search
 * modal, and any future modal.
 */
export function Sheet({ open, onClose, children, title, position = "center", className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full max-w-lg rounded-2xl border border-border-strong bg-surface-floating shadow-md",
          position === "bottom" ? "rounded-b-none md:rounded-b-2xl" : "",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-heading-sm text-text">{title}</h2>
            <IconButton aria-label="Close" onClick={onClose} size="sm">
              <X />
            </IconButton>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
