"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronRight, Layers, List, X } from "lucide-react";
import {
  JUZ_STARTS,
  PAGE_STARTS,
  SURAH_CATALOG,
  getJuzForRef,
  getPageForRef,
  juzStartRef,
  pageStartRef,
} from "@/lib/quranNavigation";
import { cn } from "@/lib/utils";

type NavTab = "surah" | "juz" | "page";

interface QuranNavigatorProps {
  open: boolean;
  onClose: () => void;
  surah: number;
  ayah: number;
  onNavigate: (surah: number, ayah: number) => void;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Left offset: after narrow sidebar (mobile) or wide sidebar (md+). */
const TOGGLE_LEFT = "left-[4.75rem] md:left-52";

export function QuranNavigatorToggle({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  const mounted = useMounted();
  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close Quran navigator" : "Open Quran navigator"}
      aria-expanded={open}
      data-testid="quran-nav-toggle"
      className={cn(
        "quran-nav-toggle fixed z-[100]",
        TOGGLE_LEFT,
        "top-1/2 -translate-y-1/2",
        "flex h-16 w-10 flex-col items-center justify-center gap-0.5",
        "rounded-r-xl border border-l-0 border-neutral-300",
        "bg-white text-neutral-700 shadow-lg",
        "transition-all hover:border-accent-teal/50 hover:bg-accent-teal/5 hover:text-teal-900",
        open && "border-accent-teal bg-accent-teal/10 text-teal-900"
      )}
    >
      <ChevronRight
        className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")}
      />
      <span className="text-[9px] font-bold uppercase tracking-wide">Nav</span>
    </button>,
    document.body
  );
}

export function QuranNavigator({
  open,
  onClose,
  surah,
  ayah,
  onNavigate,
}: QuranNavigatorProps) {
  const mounted = useMounted();
  const [tab, setTab] = useState<NavTab>("surah");
  const [filter, setFilter] = useState("");
  const [jumpAyah, setJumpAyah] = useState(String(ayah));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setJumpAyah(String(ayah));
  }, [open, ayah, surah]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredSurahs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return SURAH_CATALOG;
    return SURAH_CATALOG.filter(
      (s) =>
        String(s.n).includes(q) ||
        s.en.toLowerCase().includes(q) ||
        s.ar.includes(filter.trim())
    );
  }, [filter]);

  const go = useCallback(
    (s: number, a: number) => {
      onNavigate(s, a);
      onClose();
    },
    [onNavigate, onClose]
  );

  const jumpToAyah = () => {
    const entry = SURAH_CATALOG.find((s) => s.n === surah);
    const max = entry?.c ?? 286;
    const n = Math.min(max, Math.max(1, parseInt(jumpAyah, 10) || 1));
    go(surah, n);
  };

  const currentJuz = getJuzForRef(surah, ayah);
  const currentPage = getPageForRef(surah, ayah);

  const panelContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-accent-teal-dim" />
          <h2 className="text-sm font-semibold text-neutral-900">Navigate Quran</h2>
        </div>
        <button type="button" onClick={onClose} className="af-icon-btn" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-neutral-100 px-3 py-2">
        {(
          [
            ["surah", "Surah", List],
            ["juz", "Juz", Layers],
            ["page", "Page", BookOpen],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold",
              tab === id
                ? "bg-accent-teal/15 text-teal-900"
                : "text-neutral-500 hover:bg-neutral-50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {tab === "surah" && (
          <>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search surah…"
              className="mb-3 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-accent-teal/50 focus:ring-2 focus:ring-accent-teal/20"
            />
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2">
              <label htmlFor="ayah-jump" className="shrink-0 text-xs text-neutral-500">
                Ayah in {surah}:
              </label>
              <input
                id="ayah-jump"
                type="number"
                min={1}
                value={jumpAyah}
                onChange={(e) => setJumpAyah(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && jumpToAyah()}
                className="w-16 rounded-lg border border-neutral-200 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={jumpToAyah}
                className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white"
              >
                Go
              </button>
            </div>
            <ul className="space-y-0.5">
              {filteredSurahs.map((s) => {
                const active = s.n === surah;
                return (
                  <li key={s.n}>
                    <button
                      type="button"
                      onClick={() => go(s.n, active ? ayah : 1)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "bg-accent-teal/15 font-semibold text-teal-900"
                          : "hover:bg-neutral-50"
                      )}
                    >
                      <span className="w-7 shrink-0 text-xs text-neutral-400">{s.n}</span>
                      <span className="min-w-0 flex-1 truncate">{s.en}</span>
                      <span className="font-arabic shrink-0 text-xs text-neutral-500" dir="rtl">
                        {s.ar}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {tab === "juz" && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {JUZ_STARTS.map((_, i) => {
              const juz = i + 1;
              const [s, a] = juzStartRef(juz);
              const active = juz === currentJuz;
              return (
                <li key={juz}>
                  <button
                    type="button"
                    onClick={() => go(s, a)}
                    className={cn(
                      "w-full rounded-xl border py-3 text-center text-sm font-semibold transition-colors",
                      active
                        ? "border-accent-teal bg-accent-teal/15 text-teal-900"
                        : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                    )}
                  >
                    {juz}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {tab === "page" && (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {PAGE_STARTS.map((_, i) => {
              const page = i + 1;
              const [s, a] = pageStartRef(page);
              const active = page === currentPage;
              return (
                <li key={page}>
                  <button
                    type="button"
                    onClick={() => go(s, a)}
                    className={cn(
                      "w-full rounded-lg border py-2 text-center text-xs font-semibold transition-colors",
                      active
                        ? "border-accent-teal bg-accent-teal/15 text-teal-900"
                        : "border-neutral-200 hover:bg-neutral-50"
                    )}
                  >
                    {page}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="border-t border-neutral-100 px-4 py-2 text-center text-[11px] text-neutral-400">
        {surah}:{ayah} · Juz {currentJuz} · Page {currentPage}
      </p>
    </div>
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Close navigator backdrop"
            className={cn("fixed inset-0 z-[110] bg-black/25 backdrop-blur-[2px]", TOGGLE_LEFT)}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quran navigator"
            data-testid="quran-nav-panel-desktop"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed z-[120] hidden h-[min(92dvh,720px)] w-[min(calc(100vw-5rem),320px)] flex-col",
              TOGGLE_LEFT,
              "top-1/2 -translate-y-1/2 overflow-hidden rounded-r-2xl",
              "border border-l-0 border-neutral-200 bg-white shadow-2xl md:flex"
            )}
          >
            {panelContent}
          </motion.aside>
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Quran navigator"
            data-testid="quran-nav-panel-mobile"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[120] flex max-h-[78dvh] flex-col rounded-t-2xl",
              "border border-neutral-200 bg-white shadow-2xl md:hidden pb-safe"
            )}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-neutral-200" />
            {panelContent}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
