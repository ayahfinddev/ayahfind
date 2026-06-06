"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// SymbolId covers every clickable symbol that actually appears in the dataset.
export type SymbolId =
  | "wasl_awla"   // U+06D6 ۖ  صلى
  | "waqf_awla"   // U+06D7 ۗ  قلى
  | "waqf_lazim"  // U+06D8 ۘ  م
  | "la_waqf"     // U+06D9 ۙ  لا
  | "waqf_jaiz"   // U+06DA ۚ  ج
  | "muanaq"      // U+06DB ۛ  معانقة
  | "hizb"        // U+06DE ۞
  | "sajdah"      // U+06E9 ۩
  | "shaddah";    // U+0651 ّ

interface SymbolInfo {
  // The actual character as it appears in the text (shown large in popup header)
  glyph: string;
  // Traditional representation / what the mark abbreviates
  traditional: string;
  nameEn: string;
  nameAr: string;
  explanation: string;
  guidance: string;
}

export const SYMBOL_DATA: Record<SymbolId, SymbolInfo> = {
  wasl_awla: {
    glyph: "ۖ",
    traditional: "صلى",
    nameEn: "Wasl Awla",
    nameAr: "الوصل أولى",
    explanation:
      "Continuing is preferred here. The meaning flows better without a pause. Stopping is not forbidden but is less ideal.",
    guidance: "Continue through this mark if your breath allows.",
  },
  waqf_awla: {
    glyph: "ۗ",
    traditional: "قلى",
    nameEn: "Waqf Awla",
    nameAr: "الوقف أولى",
    explanation:
      "Stopping is preferred here for better rhetorical effect. Continuing is not forbidden.",
    guidance: "Stop here for the best reading of the verse.",
  },
  waqf_lazim: {
    glyph: "ۘ",
    traditional: "م",
    nameEn: "Waqf Lazim",
    nameAr: "وقف لازم",
    explanation:
      "Stopping is obligatory here. Continuing would completely reverse or corrupt the meaning. This is the strongest stopping mark in the Quran.",
    guidance: "Always stop here, even mid-breath if necessary.",
  },
  la_waqf: {
    glyph: "ۙ",
    traditional: "لا",
    nameEn: "La Waqf",
    nameAr: "لا وقف",
    explanation:
      "Do not stop here. Stopping would break the grammatical flow and distort the meaning entirely.",
    guidance:
      "If you accidentally stop, go back to an earlier point and restart from there.",
  },
  waqf_jaiz: {
    glyph: "ۚ",
    traditional: "ج",
    nameEn: "Waqf Jaiz",
    nameAr: "وقف جائز",
    explanation:
      "Stopping is permissible and continuation is equally acceptable. Neither choice affects the meaning.",
    guidance: "You may stop or continue — both are correct.",
  },
  muanaq: {
    glyph: "ۛ",
    traditional: "∴",
    nameEn: "Mu'anaq",
    nameAr: "وقف المعانقة",
    explanation:
      "Linked stops. This mark appears in pairs. The reader must stop at exactly ONE of the two positions — stopping at both or neither distorts the meaning.",
    guidance:
      "If you stopped at the first mark, continue past the second. If you continued past the first, stop at the second.",
  },
  hizb: {
    glyph: "۞",
    traditional: "۞",
    nameEn: "Hizb Marker",
    nameAr: "علامة الحزب",
    explanation:
      "Marks one of the 60 equal portions of the Quran used for dividing the text for systematic reading over one or two months.",
    guidance:
      "Structural reference point only — no recitation obligation implied.",
  },
  sajdah: {
    glyph: "۩",
    traditional: "۩",
    nameEn: "Sajdah Marker",
    nameAr: "علامة السجدة",
    explanation:
      "A verse of prostration. Perform sajdah al-tilawah here. Obligatory during prayer recitation, strongly recommended outside prayer.",
    guidance:
      "Bow in prostration, recite Subhana Rabbiyal A'la, then rise and continue.",
  },
  shaddah: {
    glyph: "ّ",
    traditional: "ّ",
    nameEn: "Shaddah",
    nameAr: "شدَّة",
    explanation:
      "This consonant is doubled — hold it slightly longer, like the letter is pronounced twice in one motion.",
    guidance:
      "Lean into this consonant and hold it briefly. Correct shaddah is one of the most commonly missed points for learners.",
  },
};

const SOURCE = "Based on Abu Amr al-Dani and Ibn al-Jazari (Al-Jazariyyah)";

export interface PopupTarget {
  symbolId: SymbolId;
  rect: DOMRect;
}

interface SymbolPopupProps {
  target: PopupTarget;
  onClose: () => void;
}

const POPUP_WIDTH = 300;
const MARGIN = 10;

export function SymbolPopup({ target, onClose }: SymbolPopupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const data = SYMBOL_DATA[target.symbolId];

  const { rect } = target;
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  // Place popup below the symbol; flip above when insufficient space
  const estimatedHeight = 260;
  const spaceBelow = vh - rect.bottom - MARGIN;
  const placeAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
  const top = placeAbove ? rect.top - MARGIN - estimatedHeight : rect.bottom + MARGIN;

  // Clamp horizontally — RTL text means symbol is on the right, so anchor right-aligned
  let left = rect.left + rect.width / 2 - POPUP_WIDTH / 2;
  left = Math.max(MARGIN, Math.min(left, vw - POPUP_WIDTH - MARGIN));

  // Dismiss on outside click/touch
  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handle);
      document.addEventListener("touchstart", handle);
    }, 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [onClose]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const popup = (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${data.nameEn} — Quranic symbol`}
      style={{ top, left, width: POPUP_WIDTH }}
      className="symbol-popup fixed z-[200] overflow-hidden rounded-xl border border-border bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:bg-canvas-elevated dark:border-glass-border dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 dark:border-glass-border">
        {/* Glyph + traditional form */}
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <span
            className="font-arabic text-2xl leading-none text-amber-500"
            dir="rtl"
            lang="ar"
            aria-hidden="true"
          >
            {data.glyph}
          </span>
          {data.traditional !== data.glyph && (
            <span
              className="font-arabic text-[0.65rem] leading-none text-ink-muted"
              dir="rtl"
              lang="ar"
            >
              ({data.traditional})
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-ink">{data.nameEn}</p>
          <p
            className="font-arabic text-xs leading-tight text-teal-600 dark:text-accent-dim"
            dir="rtl"
            lang="ar"
          >
            {data.nameAr}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:bg-canvas-elevated hover:text-ink dark:hover:bg-canvas-card"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-2.5 px-4 py-3 text-xs leading-relaxed">
        <p className="text-ink-muted">{data.explanation}</p>

        <div>
          <p className="font-medium text-ink">Guidance</p>
          <p className="mt-0.5 text-ink-muted">{data.guidance}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 dark:border-glass-border">
        <p className="text-[10px] italic leading-snug text-ink-subtle">{SOURCE}</p>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
