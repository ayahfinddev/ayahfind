"use client";

import { useState, useCallback } from "react";
import { SymbolPopup, type SymbolId, type PopupTarget } from "./SymbolPopup";

// ─── Symbol codepoint → id mapping ────────────────────────────────────────────
// All waqf/structural marks in this dataset are dedicated Unicode Quranic
// annotation characters (U+06D6–U+06DB, U+06DE, U+06E9) that appear as
// space-separated standalone tokens in the text_ar field.
// Regular Arabic letters (م ج ط…) are NOT used as waqf marks in this dataset.
const CP_TO_SYMBOL_ID: Record<number, SymbolId> = {
  0x06d6: "wasl_awla",   // ۖ ARABIC SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA (صلى)
  0x06d7: "waqf_awla",   // ۗ ARABIC SMALL HIGH LIGATURE QAF WITH LAM WITH ALEF MAKSURA (قلى)
  0x06d8: "waqf_lazim",  // ۘ ARABIC SMALL HIGH MEEM INITIAL FORM (م)
  0x06d9: "la_waqf",     // ۙ ARABIC SMALL HIGH LAM ALEF (لا)
  0x06da: "waqf_jaiz",   // ۚ ARABIC SMALL HIGH JEEM (ج)
  0x06db: "muanaq",      // ۛ ARABIC SMALL HIGH THREE DOTS (معانقة linked stop)
  0x06de: "hizb",        // ۞ ARABIC START OF RUB EL HIZB
  0x06e9: "sajdah",      // ۩ ARABIC PLACE OF SAJDAH
};

// Characters classified as waqf marks (should render raised/superscript)
const WAQF_MARK_CPS = new Set([0x06d6, 0x06d7, 0x06d8, 0x06d9, 0x06da, 0x06db]);

type TokenKind = "text" | "waqf" | "structural" | "shaddah";

type Token =
  | { kind: "text"; content: string }
  | { kind: "waqf" | "structural" | "shaddah"; content: string; symbolId: SymbolId };

/**
 * Tokenize Arabic Quran text into renderable segments.
 *
 * Detection:
 *   1. Waqf/structural marks — dedicated Unicode codepoints U+06D6–U+06DB, U+06DE, U+06E9.
 *      They appear as space-separated standalone characters in the data.
 *   2. Shaddah clusters — Arabic letter + optional non-shaddah diacritics + U+0651 (shaddah)
 *      + optional trailing diacritics. The whole grapheme cluster is one clickable token.
 *   3. Everything else — rendered as plain text.
 */
function tokenize(text: string): Token[] {
  const result: Token[] = [];

  // Matches waqf/structural marks OR an Arabic-letter shaddah cluster.
  // Non-shaddah diacritics: U+064B–U+0650, U+0652–U+065F (excludes shaddah U+0651 itself).
  const re =
    /([ۖ-ۛ۞۩]|[؀-ۿ][ً-ِْ-ٟ]*ّ[ً-ِْ-ٟ]*)/g;

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
      const kind: TokenKind = WAQF_MARK_CPS.has(cp) ? "waqf" : "structural";
      result.push({ kind, content: matched, symbolId });
    } else {
      // Shaddah cluster (no dedicated symbol id for the base char)
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
    (e: React.MouseEvent<HTMLSpanElement>, symbolId: SymbolId) => {
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
          // Waqf marks appear above the line in a real mushaf.
          // Lift them with vertical-align + smaller font.
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Waqf mark — click to learn more`}
              onClick={(e) => handleClick(e, symbolId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopup({ symbolId, rect });
                }
              }}
              className="quran-waqf-mark inline-block cursor-pointer select-none text-[0.85em] leading-none text-amber-500 transition-opacity hover:opacity-70 focus-visible:outline-none"
              style={{ verticalAlign: "0.55em", padding: "0 1px" }}
            >
              {content}
            </span>
          );
        }

        if (kind === "structural") {
          // ۞ (hizb) and ۩ (sajdah) render inline at normal size
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Quranic symbol — click to learn more`}
              onClick={(e) => handleClick(e, symbolId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopup({ symbolId, rect });
                }
              }}
              className="quran-structural-mark cursor-pointer select-none text-amber-500 transition-opacity hover:opacity-80 focus-visible:outline-none"
            >
              {content}
            </span>
          );
        }

        // Shaddah cluster — mark the whole cluster with a dotted underline.
        // Don't change text color (the base letter would turn amber, which is distracting).
        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`Shaddah — click to learn more`}
            onClick={(e) => handleClick(e, symbolId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setPopup({ symbolId, rect });
              }
            }}
            className="quran-shaddah cursor-pointer underline decoration-amber-400/60 decoration-solid underline-offset-2 transition-opacity hover:decoration-amber-500/80 focus-visible:outline-none"
          >
            {content}
          </span>
        );
      })}

      {popup && <SymbolPopup target={popup} onClose={() => setPopup(null)} />}
    </>
  );
}
