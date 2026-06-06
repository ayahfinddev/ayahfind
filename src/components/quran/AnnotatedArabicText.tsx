"use client";

import { useState, useCallback } from "react";
import { SymbolPopup, type SymbolId, type PopupTarget } from "./SymbolPopup";

// ─── Symbol codepoint → id mapping ────────────────────────────────────────────
// All waqf/structural marks in this dataset are dedicated Unicode Quranic
// annotation characters (U+06D6–U+06DB, U+06DE, U+06E9) that appear as
// space-separated standalone tokens in the text_ar field.
const CP_TO_SYMBOL_ID: Record<number, SymbolId> = {
  0x06d6: "wasl_awla",   // ۖ  صلى  Wasl Awla
  0x06d7: "waqf_awla",   // ۗ  قلى  Waqf Awla
  0x06d8: "waqf_lazim",  // ۘ  م    Waqf Lazim
  0x06d9: "la_waqf",     // ۙ  لا   La Waqf
  0x06da: "waqf_jaiz",   // ۚ  ج    Waqf Jaiz
  0x06db: "muanaq",      // ۛ  ∴    Mu'anaq (linked stops)
  0x06de: "hizb",        // ۞       Hizb marker
  0x06e9: "sajdah",      // ۩       Sajdah marker
};

// Waqf marks should appear raised above the baseline (like in a real mushaf)
const WAQF_MARK_CPS = new Set([0x06d6, 0x06d7, 0x06d8, 0x06d9, 0x06da, 0x06db]);

type Token =
  | { kind: "text"; content: string }
  | { kind: "waqf" | "structural" | "shaddah"; content: string; symbolId: SymbolId };

/**
 * Tokenize Arabic Quran text into renderable segments.
 *
 * Detection:
 *   1. Waqf/structural marks — dedicated Unicode codepoints (U+06D6–U+06DB, U+06DE, U+06E9).
 *   2. Shaddah clusters — Arabic letter + optional non-shaddah diacritics + U+0651 shaddah.
 *   3. Everything else — plain text.
 */
function tokenize(text: string): Token[] {
  const result: Token[] = [];

  // Group 1: waqf/structural marks  U+06D6-U+06DB, U+06DE, U+06E9
  // Group 2: shaddah cluster  — Arabic char + optional diacritics (excl shaddah) + shaddah
  const re = /([ۖ-ۛ۞۩]|[؀-ۿ][ً-ِْ-ٟ]*ّ[ً-ِْ-ٟ]*)/g;

  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      result.push({ kind: "text", content: text.slice(last, m.index) });
    }

    const matched = m[0];
    const cp = matched.codePointAt(0)!;
    const symbolId = CP_TO_SYMBOL_ID[cp];

    if (symbolId) {
      result.push({ kind: WAQF_MARK_CPS.has(cp) ? "waqf" : "structural", content: matched, symbolId });
    } else {
      result.push({ kind: "shaddah", content: matched, symbolId: "shaddah" });
    }

    last = m.index + matched.length;
  }

  if (last < text.length) {
    result.push({ kind: "text", content: text.slice(last) });
  }

  return result;
}

interface AnnotatedArabicTextProps {
  text: string;
}

export function AnnotatedArabicText({ text }: AnnotatedArabicTextProps) {
  const [popup, setPopup] = useState<PopupTarget | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, symbolId: SymbolId) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setPopup((prev) =>
        prev?.symbolId === symbolId && Math.abs(prev.rect.left - rect.left) < 4
          ? null
          : { symbolId, rect }
      );
    },
    []
  );

  const tokens = tokenize(text);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.kind === "text") {
          return <span key={i}>{token.content}</span>;
        }

        const { kind, content, symbolId } = token;

        if (kind === "waqf") {
          // Raised above the baseline to match real mushaf layout.
          // <button> ensures reliable click/tap on all browsers including iOS Safari.
          return (
            <button
              key={i}
              type="button"
              aria-label="Waqf mark — tap to learn more"
              onClick={(e) => handleClick(e, symbolId)}
              className="quran-waqf-mark inline-block cursor-pointer select-none border-0 bg-transparent p-0 font-arabic text-[0.9em] leading-none text-amber-500 hover:opacity-70 focus-visible:outline-none"
              style={{ verticalAlign: "0.55em", touchAction: "manipulation", lineHeight: 0 }}
            >
              {content}
            </button>
          );
        }

        if (kind === "structural") {
          // ۞ (hizb) and ۩ (sajdah) — inline at normal size
          return (
            <button
              key={i}
              type="button"
              aria-label="Quranic symbol — tap to learn more"
              onClick={(e) => handleClick(e, symbolId)}
              className="quran-structural-mark inline cursor-pointer select-none border-0 bg-transparent p-0 font-arabic text-amber-500 hover:opacity-70 focus-visible:outline-none"
              style={{ touchAction: "manipulation" }}
            >
              {content}
            </button>
          );
        }

        // Shaddah — solid amber underline, no color change on the letter itself
        return (
          <button
            key={i}
            type="button"
            aria-label="Shaddah — tap to learn more"
            onClick={(e) => handleClick(e, symbolId)}
            className="quran-shaddah inline cursor-pointer select-none border-0 bg-transparent p-0 font-arabic underline decoration-amber-400/70 decoration-solid underline-offset-2 hover:decoration-amber-500 focus-visible:outline-none"
            style={{ touchAction: "manipulation" }}
          >
            {content}
          </button>
        );
      })}

      {popup && <SymbolPopup target={popup} onClose={() => setPopup(null)} />}
    </>
  );
}
