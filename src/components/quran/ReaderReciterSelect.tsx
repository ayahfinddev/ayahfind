"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, UserRound } from "lucide-react";
import { useReciter } from "@/hooks/useReciter";
import { ENABLED_RECITERS, type ReciterId } from "@/lib/reciters";
import { cn } from "@/lib/utils";

const TOAST_MS = 2200;

function shortReciterLabel(name: string): string {
  const first = name.split(/\s+/)[0];
  return first.length >= 3 ? first : name;
}

interface ReaderReciterSelectProps {
  dropdownDirection?: "down" | "up";
}

export function ReaderReciterSelect({ dropdownDirection = "down" }: ReaderReciterSelectProps) {
  const { reciterId, reciter, setReciterId } = useReciter();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((name: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(name);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_MS);
  }, []);

  const pickReciter = useCallback(
    (id: ReciterId) => {
      if (id === reciterId) {
        setOpen(false);
        return;
      }
      const next = ENABLED_RECITERS.find((r) => r.id === id);
      setReciterId(id);
      setOpen(false);
      if (next) showToast(next.name);
    },
    [reciterId, setReciterId, showToast]
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex max-w-[7.5rem] items-center gap-1 rounded-xl border px-2 py-1.5 text-left text-xs font-medium transition-colors sm:max-w-[9.5rem]",
            open
              ? "border-accent-teal/40 bg-accent-teal/10 text-teal-900"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          title={`Reciter: ${reciter.name}`}
        >
          <UserRound className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
          <span className="min-w-0 truncate">
            <span className="hidden sm:inline">{reciter.name}</span>
            <span className="sm:hidden">{shortReciterLabel(reciter.name)}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Choose reciter"
            className={cn(
              "absolute right-0 z-50 max-h-[min(16rem,50vh)] w-[min(16rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-glass-border bg-white py-1 shadow-lg",
              dropdownDirection === "up" ? "bottom-full mb-1" : "top-full mt-1"
            )}
          >
            {ENABLED_RECITERS.map((r) => (
              <li key={r.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={reciterId === r.id}
                  onClick={() => pickReciter(r.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                    reciterId === r.id
                      ? "bg-accent-teal/10 text-teal-900"
                      : "text-neutral-700 hover:bg-neutral-50"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="shrink-0 text-[10px] text-neutral-400">{r.bitrate}</span>
                  {reciterId === r.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent-teal" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-none fixed left-1/2 z-[90] max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-full border border-neutral-200 bg-white/95 px-4 py-2 text-center text-xs font-medium text-neutral-800 shadow-md backdrop-blur-sm",
            dropdownDirection === "up"
              ? "bottom-[calc(4rem+var(--safe-bottom,0px))]"
              : "bottom-[calc(4.5rem+var(--safe-bottom,0px))]"
          )}
        >
          Reciter: {toast}
        </div>
      )}
    </>
  );
}