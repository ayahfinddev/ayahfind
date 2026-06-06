"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type SymbolId =
  | "waqf_lazim"
  | "la_waqf"
  | "waqf_jaiz"
  | "waqf_awla"
  | "wasl_awla"
  | "waqf_mutlaq"
  | "waqf_mujawwaz"
  | "waqf_murakhkhas"
  | "waqfah"
  | "sajdah"
  | "verse_end"
  | "ruku"
  | "hizb"
  | "shaddah";

interface SymbolInfo {
  symbol: string;
  nameEn: string;
  nameAr: string;
  explanation: string;
  guidance: string;
  examples: string;
}

export const SYMBOL_DATA: Record<SymbolId, SymbolInfo> = {
  waqf_lazim: {
    symbol: "م",
    nameEn: "Waqf Lazim",
    nameAr: "وقف لازم",
    explanation:
      "This is the strongest stopping mark in the Quran. Stopping here is obligatory — continuing without pausing would completely reverse or corrupt the intended meaning of the verse.",
    guidance:
      "Always stop here, even mid-breath if necessary. This is non-negotiable in recitation.",
    examples: "Al-Baqarah 2:2, Al-Baqarah 2:7, Al-Kahf 18:1–2",
  },
  la_waqf: {
    symbol: "لا",
    nameEn: "La Waqf",
    nameAr: "لا وقف",
    explanation:
      "Stopping here is not allowed. The grammatical or semantic connection runs continuously through this point — breaking it would distort the meaning of the verse entirely.",
    guidance:
      "Continue reading without pausing. If you accidentally stop due to breathlessness, go back to an earlier point in the sentence and restart from there to preserve the full meaning.",
    examples: "Al-Baqarah 2:1–2, Al-Fatiha 1:4",
  },
  waqf_jaiz: {
    symbol: "ج",
    nameEn: "Waqf Jaiz",
    nameAr: "وقف جائز",
    explanation:
      "Stopping is equally permissible and continuation is equally acceptable. Neither choice affects the intended meaning — the verse reads correctly either way.",
    guidance:
      "You may stop here to catch your breath or for emphasis, or continue without stopping. Both are correct.",
    examples: "Al-Baqarah 2:6, Al-Imran 3:7",
  },
  waqf_awla: {
    symbol: "قلى",
    nameEn: "Waqf Awla",
    nameAr: "الوقف أولى",
    explanation:
      "Stopping is the preferred and recommended option here. Continuing is not forbidden but stopping demonstrates better understanding of the verse's structure and rhetorical effect.",
    guidance:
      "Readers are encouraged to stop here. The meaning is naturally complete at this point.",
    examples: "Al-Baqarah 2:29, Al-Imran 3:18",
  },
  wasl_awla: {
    symbol: "صلى",
    nameEn: "Wasl Awla",
    nameAr: "الوصل أولى",
    explanation:
      "Continuing without stopping is preferred here. The verse carries fuller meaning when read without a break at this point. Stopping is not forbidden but is less ideal.",
    guidance:
      "Continue through this mark if your breath allows. The meaning flows better without a pause here.",
    examples: "Al-Baqarah 2:5, Al-Nisa 4:14",
  },
  waqf_mutlaq: {
    symbol: "ط",
    nameEn: "Waqf Mutlaq",
    nameAr: "وقف مطلق",
    explanation:
      "An absolute and complete stopping point. The topic or statement is fully concluded here and a new idea follows.",
    guidance:
      "Always stop here. The meaning is complete and a new concept begins after this point.",
    examples: "Al-Baqarah 2:33, Al-Imran 3:30",
  },
  waqf_mujawwaz: {
    symbol: "ز",
    nameEn: "Waqf Mujawwaz",
    nameAr: "وقف مجوَّز",
    explanation:
      "Stopping is technically permitted here but continuing is the better choice. The mark exists to indicate that stopping, while not ideal, will not misrepresent the verse.",
    guidance:
      "Try to continue if possible. Stop only if you genuinely need to breathe.",
    examples: "Al-Baqarah 2:10, Al-Baqarah 2:16",
  },
  waqf_murakhkhas: {
    symbol: "ص",
    nameEn: "Waqf Murakhkhas",
    nameAr: "وقف مرخَّص",
    explanation:
      "Stopping here is only a concession for genuine necessity such as extreme breathlessness. In normal circumstances the reader must continue. This is the weakest and most reluctant stopping permission in the Quran.",
    guidance:
      "Only stop here if you truly cannot continue. If you do stop, return slightly before this point and re-read from there to restore the full sense of the passage.",
    examples: "Al-Baqarah 2:8–9",
  },
  waqfah: {
    symbol: "وقفة",
    nameEn: "Waqfah",
    nameAr: "وقفة",
    explanation:
      "A very brief pause — shorter than a full stop but longer than a normal reading breath. The reader pauses momentarily without fully stopping the breath or the flow of recitation.",
    guidance:
      "Pause slightly here as if allowing the word to settle, but do not restart your breath. Continue in the same breath cycle.",
    examples: "Al-Kahf 18:1–2, Yasin 36:52",
  },
  sajdah: {
    symbol: "۩",
    nameEn: "Sajdah Marker",
    nameAr: "علامة السجدة",
    explanation:
      "This marks one of the 15 verses of prostration in the Quran. When a reader reaches this verse, a prostration of recitation (sajdah al-tilawah) is recommended. Most scholars consider it obligatory during prayer recitation and highly recommended outside of prayer.",
    guidance:
      "When you reach this verse, perform sajdah — bow in prostration and recite Subhana Rabbiyal A'la. Rise and continue reading. Outside of prayer this prostration is sunnah according to the majority of scholars.",
    examples: "Al-Araf 7:206, Al-Isra 17:107, Al-Sajdah 32:15, Al-Najm 53:62",
  },
  verse_end: {
    symbol: "۝",
    nameEn: "Verse End Marker",
    nameAr: "فاصلة الآية",
    explanation:
      "This ornamental marker indicates the end of a Quranic verse (ayah). It is a structural marker only — it carries no stopping instruction on its own.",
    guidance:
      "This marks where one verse ends and the next begins. You may stop, continue, or pause briefly — the mark conveys structure not obligation.",
    examples: "Appears at the end of every verse throughout the Quran",
  },
  ruku: {
    symbol: "ع",
    nameEn: "Ruku Marker",
    nameAr: "علامة الركوع",
    explanation:
      "Marks the beginning of a ruku — a thematic grouping of verses used in the Hanafi tradition to divide the Quran into roughly equal units for structured daily recitation.",
    guidance:
      "This is an informational marker only. No stopping instruction is implied. Used by readers following Hanafi-tradition recitation schedules.",
    examples:
      "Al-Baqarah contains 40 ruku sections — one of the highest in the Quran",
  },
  hizb: {
    symbol: "۞",
    nameEn: "Hizb Marker",
    nameAr: "علامة الحزب",
    explanation:
      "Marks the beginning of a hizb — one of the 60 equal portions of the Quran used for dividing the text for systematic reading over one or two months.",
    guidance:
      "A structural reference point only. No recitation instruction is implied. Used by readers following hizb-based reading schedules.",
    examples:
      "Each juz contains exactly two hizb sections — 60 total across the Quran",
  },
  shaddah: {
    symbol: "ّ",
    nameEn: "Shaddah",
    nameAr: "شدَّة",
    explanation:
      "This consonant is doubled — it carries both a sukun and a vowel, making it sound like the letter is pronounced twice in one motion. It must be held slightly longer than a single consonant.",
    guidance:
      "Lean into this consonant and hold it briefly before releasing. It should feel like a double letter compressed into one sound. Correct shaddah is one of the most commonly missed points for learners.",
    examples: "إِيَّاكَ (iyya-ka) in Al-Fatiha 1:5, رَبِّ (rabbi) throughout the Quran",
  },
};

const SOURCE =
  "Based on classical waqf and tajweed scholarship — Abu Amr al-Dani, Ibn al-Jazari (Al-Jazariyyah), and the King Fahd Complex Mushaf conventions";

export interface PopupTarget {
  symbolId: SymbolId;
  rect: DOMRect;
}

interface SymbolPopupProps {
  target: PopupTarget;
  onClose: () => void;
}

const POPUP_WIDTH = 320;
const POPUP_MARGIN = 12;

export function SymbolPopup({ target, onClose }: SymbolPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const data = SYMBOL_DATA[target.symbolId];

  // Compute popup position, keeping within viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  const { rect } = target;
  const symbolCenterX = rect.left + rect.width / 2;
  const symbolBottom = rect.bottom;
  const symbolTop = rect.top;

  // Prefer below the symbol; flip above if not enough space
  const spaceBelow = vh - symbolBottom - POPUP_MARGIN;
  const estimatedHeight = 320;
  const placeAbove = spaceBelow < estimatedHeight && symbolTop > estimatedHeight;

  let top = placeAbove
    ? symbolTop - POPUP_MARGIN - estimatedHeight
    : symbolBottom + POPUP_MARGIN;

  // Clamp horizontal so popup stays on screen
  let left = symbolCenterX - POPUP_WIDTH / 2;
  left = Math.max(POPUP_MARGIN, Math.min(left, vw - POPUP_WIDTH - POPUP_MARGIN));

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent | TouchEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Small delay so the same click that opened the popup doesn't immediately close it
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

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const popup = (
    <div
      ref={popupRef}
      role="dialog"
      aria-label={`${data.nameEn} — Quranic symbol explanation`}
      style={{ top, left, width: POPUP_WIDTH }}
      className="symbol-popup fixed z-[200] overflow-hidden rounded-2xl border border-glass-border bg-canvas-elevated shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-glass-border px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="font-arabic text-3xl leading-none text-amber-400 shrink-0"
            dir="rtl"
            lang="ar"
            aria-hidden="true"
          >
            {data.symbol}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink leading-tight">{data.nameEn}</p>
            <p
              className="font-arabic text-xs text-ink-muted leading-tight mt-0.5"
              dir="rtl"
              lang="ar"
            >
              {data.nameAr}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="af-icon-btn shrink-0 -mr-1 -mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3 text-xs leading-relaxed">
        <p className="text-ink-muted">{data.explanation}</p>

        <div>
          <p className="font-semibold text-ink mb-0.5">Reading guidance</p>
          <p className="text-ink-muted">{data.guidance}</p>
        </div>

        <div>
          <p className="font-semibold text-ink mb-0.5">Examples</p>
          <p className="text-ink-muted">{data.examples}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-glass-border px-4 py-2">
        <p className="text-[10px] text-ink-subtle leading-snug italic">{SOURCE}</p>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(popup, document.body);
}
