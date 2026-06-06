"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Layers, List, X } from "lucide-react";
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

const EASE = [0.32, 0.72, 0, 1] as const;
const PANEL_W = 320;

export function QuranNavigatorToggle({
  open,
  onClick,
  surahName,
}: {
  open: boolean;
  onClick: () => void;
  surahName?: string;
}) {
  const mounted = useMounted();
  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close chapter navigator" : "Open chapter navigator"}
      aria-expanded={open}
      className={cn(
        // Fixed tab — flush with the right edge of the SideNav at each breakpoint
        // mobile: no sidebar → left-0 | md: 4.75rem sidebar | lg: 13rem (w-52) sidebar
        "fixed left-0 md:left-[4.75rem] lg:left-52 top-1/2 z-[100] -translate-y-1/2",
        "flex flex-col items-center justify-center gap-2",
        "h-[88px] w-10 rounded-r-2xl",
        // Glass look that works in both light and dark
        "border border-l-0 border-glass-border bg-canvas shadow-lg backdrop-blur-sm",
        "text-ink-muted",
        "transition-all duration-200 ease-out",
        "hover:w-12 hover:border-accent-border hover:bg-accent-surface hover:text-accent-dim",
        open && "border-accent-border bg-accent-surface text-accent-dim w-12"
      )}
    >
      <BookOpen className="h-4 w-4 shrink-0" />
      <span
        className="select-none text-[8px] font-bold uppercase tracking-widest text-current"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {open ? "Close" : "Chapters"}
      </span>
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
  const activeSurahRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setJumpAyah(String(ayah));
  }, [open, ayah, surah]);

  useEffect(() => {
    if (!open || tab !== "surah") return;
    const t = setTimeout(() => {
      activeSurahRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 220);
    return () => clearTimeout(t);
  }, [open, tab, surah]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
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
    (s: number, a: number) => { onNavigate(s, a); onClose(); },
    [onNavigate, onClose]
  );

  const jumpToAyah = () => {
    const entry = SURAH_CATALOG.find((s) => s.n === surah);
    const max = entry?.c ?? 286;
    const n = Math.min(max, Math.max(1, parseInt(jumpAyah, 10) || 1));
    go(surah, n);
  };

  const currentJuz  = getJuzForRef(surah, ayah);
  const currentPage = getPageForRef(surah, ayah);

  const panelContent = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-glass-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-4 w-4 text-accent-dim" />
          <h2 className="text-sm font-semibold text-ink">Navigate</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-canvas-card hover:text-ink"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-glass-border px-3 py-2">
        {([
          ["surah", "Surah",  List],
          ["juz",   "Juz",   Layers],
          ["page",  "Page",  BookOpen],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition-colors",
              tab === id
                ? "bg-accent-surface text-accent-dim"
                : "text-ink-muted hover:bg-canvas-elevated hover:text-ink"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="quran-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {tab === "surah" && (
          <>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search surah…"
              className="mb-3 w-full rounded-xl border border-border-strong bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-accent-border focus:ring-2 focus:ring-accent-surface"
            />
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-canvas-elevated px-3 py-2">
              <label htmlFor="ayah-jump" className="shrink-0 text-xs text-ink-muted">
                Ayah in {surah}:
              </label>
              <input
                id="ayah-jump"
                type="number"
                min={1}
                value={jumpAyah}
                onChange={(e) => setJumpAyah(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && jumpToAyah()}
                className="w-16 rounded-lg border border-border-strong bg-canvas px-2 py-1 text-sm text-ink"
              />
              <button
                type="button"
                onClick={jumpToAyah}
                className="rounded-lg bg-accent-dim px-2.5 py-1 text-xs font-semibold text-white"
              >
                Go
              </button>
            </div>
            <ul className="space-y-0.5 pb-16">
              {filteredSurahs.map((s) => {
                const active = s.n === surah;
                return (
                  <li key={s.n}>
                    <button
                      ref={active ? activeSurahRef : undefined}
                      type="button"
                      onClick={() => go(s.n, active ? ayah : 1)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "bg-accent-surface font-semibold text-accent-dim"
                          : "text-ink hover:bg-canvas-elevated"
                      )}
                    >
                      <span className="w-7 shrink-0 text-xs text-ink-subtle">{s.n}</span>
                      <span className="min-w-0 flex-1 truncate">{s.en}</span>
                      <span className="font-arabic shrink-0 text-xs text-ink-muted" dir="rtl">{s.ar}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {tab === "juz" && (
          <ul className="grid grid-cols-3 gap-2 pb-8 sm:grid-cols-4">
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
                        ? "border-accent-border bg-accent-surface text-accent-dim"
                        : "border-border-strong text-ink hover:border-accent-border hover:bg-canvas-elevated"
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
          <ul className="grid grid-cols-4 gap-2 pb-8 sm:grid-cols-5">
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
                        ? "border-accent-border bg-accent-surface text-accent-dim"
                        : "border-border-strong text-ink hover:bg-canvas-elevated"
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

      {/* Footer */}
      <p className="shrink-0 border-t border-glass-border px-4 py-2.5 text-center text-[11px] text-ink-subtle">
        {surah}:{ayah} · Juz {currentJuz} · Page {currentPage}
      </p>
    </div>
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel — always slides from the left */}
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Quran navigator"
            initial={{ x: -PANEL_W }}
            animate={{ x: 0, transition: { type: "spring", damping: 30, stiffness: 260, mass: 0.85 } }}
            exit={{ x: -PANEL_W, transition: { duration: 0.3, ease: EASE } }}
            style={{ width: PANEL_W, willChange: "transform" }}
            className="fixed inset-y-0 left-0 z-[120] flex flex-col overflow-hidden border-r border-glass-border bg-canvas shadow-2xl"
          >
            {panelContent}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
