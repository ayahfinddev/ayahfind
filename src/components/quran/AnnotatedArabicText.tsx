"use client";

import { useState, useCallback } from "react";
import { SymbolPopup, type SymbolId, type PopupTarget } from "./SymbolPopup";

// Waqf/structural marks that appear as isolated words (surrounded by whitespace or boundaries).
// Ordered longest-first so multi-char strings are checked before their substrings.
const ISOLATED_MARKS: Array<[string, SymbolId]> = [
  ["وقفة", "waqfah"],
  ["قلى", "waqf_awla"],
  ["صلى", "wasl_awla"],
  ["لا", "la_waqf"],
  ["م", "waqf_lazim"],
  ["ج", "waqf_jaiz"],
  ["ط", "waqf_mutlaq"],
  ["ز", "waqf_mujawwaz"],
  ["ص", "waqf_murakhkhas"],
  ["ع", "ruku"],
];

const ISOLATED_MAP = new Map<string, SymbolId>(ISOLATED_MARKS);

// Special Unicode Quranic symbols (non-letter, always markers)
const SPECIAL_SYMBOL_MAP: Record<string, SymbolId> = {
  "۩": "sajdah",   // ۩
  "۝": "verse_end", // ۝
  "۞": "hizb",     // ۞
};

type Token =
  | { type: "text"; content: string }
  | { type: "symbol"; content: string; symbolId: SymbolId };

/**
 * For a plain-text segment (no special unicode markers or shaddah clusters),
 * split by whitespace and check each word against the isolated-mark list.
 */
function processWordSegment(text: string, result: Token[]): void {
  // Split preserving whitespace runs as their own elements
  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      result.push({ type: "text", content: part });
      continue;
    }
    const id = ISOLATED_MAP.get(part);
    if (id) {
      result.push({ type: "symbol", content: part, symbolId: id });
    } else {
      result.push({ type: "text", content: part });
    }
  }
}

/**
 * Tokenize Arabic Quran text into plain text runs and clickable symbol tokens.
 *
 * Detection strategy:
 * 1. Special Unicode markers (۩ ۝ ۞) — always symbols, match directly.
 * 2. Shaddah clusters — Arabic letter(s) + optional diacritics + shaddah (U+0651)
 *    + optional trailing diacritics. Match the whole grapheme cluster.
 * 3. Isolated waqf letter marks — only when the token is an entire whitespace-
 *    delimited word (so م in مَالِك is NOT matched, but standalone م is).
 */
function tokenize(text: string): Token[] {
  const result: Token[] = [];

  // Regex group 1: special unicode Quranic codepoints
  // Regex group 2: Arabic letter + optional diacritics + shaddah + optional trailing diacritics
  const re =
    /([۩۝۞]|[؀-ۿ][ً-ٟ]*ّ[ً-ٟ]*)/g;

  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      processWordSegment(text.slice(last, m.index), result);
    }

    const matched = m[0];
    const specialId = SPECIAL_SYMBOL_MAP[matched];
    if (specialId) {
      result.push({ type: "symbol", content: matched, symbolId: specialId });
    } else {
      // It's a shaddah cluster
      result.push({ type: "symbol", content: matched, symbolId: "shaddah" });
    }

    last = m.index + matched.length;
  }

  if (last < text.length) {
    processWordSegment(text.slice(last), result);
  }

  return result;
}

interface AnnotatedArabicTextProps {
  text: string;
  className?: string;
}

export function AnnotatedArabicText({ text, className }: AnnotatedArabicTextProps) {
  const [popup, setPopup] = useState<PopupTarget | null>(null);

  const handleSymbolClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>, symbolId: SymbolId) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setPopup((prev) =>
        prev?.symbolId === symbolId &&
        Math.abs(prev.rect.left - rect.left) < 2
          ? null
          : { symbolId, rect }
      );
    },
    []
  );

  const tokens = tokenize(text);

  return (
    <>
      <span className={className}>
        {tokens.map((token, i) => {
          if (token.type === "text") {
            return <span key={i}>{token.content}</span>;
          }
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Quranic symbol: ${token.symbolId.replace(/_/g, " ")}`}
              onClick={(e) => handleSymbolClick(e, token.symbolId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopup({ symbolId: token.symbolId, rect });
                }
              }}
              className="quran-symbol relative inline cursor-pointer rounded text-amber-400 underline decoration-amber-400/30 decoration-dotted underline-offset-2 transition-colors hover:text-amber-300 hover:decoration-amber-300/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
            >
              {token.content}
            </span>
          );
        })}
      </span>

      {popup && (
        <SymbolPopup target={popup} onClose={() => setPopup(null)} />
      )}
    </>
  );
}
