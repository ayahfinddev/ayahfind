"use client";

import { useState, useCallback, useRef } from "react";
import { SymbolPopup, type SymbolId, type PopupTarget } from "./SymbolPopup";

// ─── Codepoint → symbol id ───────────────────────────────────────────────────
// Confirmed against the actual dataset: these dedicated Unicode Quranic annotation
// characters (U+06D6–U+06DB, U+06DE, U+06E9) appear in text_ar as standalone tokens.
const CP_TO_ID: Record<number, SymbolId> = {
  0x06d6: "wasl_awla",
  0x06d7: "waqf_awla",
  0x06d8: "waqf_lazim",
  0x06d9: "la_waqf",
  0x06da: "waqf_jaiz",
  0x06db: "muanaq",
  0x06de: "hizb",
  0x06e9: "sajdah",
};

const WAQF_CPS = new Set([0x06d6, 0x06d7, 0x06d8, 0x06d9, 0x06da, 0x06db]);

type Token =
  | { kind: "text"; content: string }
  | { kind: "waqf" | "structural" | "shaddah"; content: string; symbolId: SymbolId };

function tokenize(text: string): Token[] {
  const result: Token[] = [];
  // Use explicit Unicode escapes to avoid any file-encoding ambiguity.
  // U+06D6–U+06DB = waqf marks, U+06DE = hizb, U+06E9 = sajdah
  // Shaddah cluster: Arabic char + optional diacritics (excl U+0651) + shaddah U+0651
  const re = /[ۖ-ۛ۞۩]|[؀-ۿ][ً-ِْ-ٟ]*ّ[ً-ِْ-ٟ]*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) result.push({ kind: "text", content: text.slice(last, m.index) });

    const matched = m[0];
    const cp = matched.codePointAt(0)!;
    const symbolId = CP_TO_ID[cp];

    if (symbolId) {
      result.push({ kind: WAQF_CPS.has(cp) ? "waqf" : "structural", content: matched, symbolId });
    } else {
      result.push({ kind: "shaddah", content: matched, symbolId: "shaddah" });
    }

    last = m.index + matched.length;
  }

  if (last < text.length) result.push({ kind: "text", content: text.slice(last) });
  return result;
}

interface Props { text: string }

export function AnnotatedArabicText({ text }: Props) {
  const [popup, setPopup] = useState<PopupTarget | null>(null);
  // Guard against duplicate pointer/click firing on the same interaction
  const lastFiredRef = useRef<number>(0);

  const openPopup = useCallback((symbolId: SymbolId, el: HTMLElement) => {
    const now = Date.now();
    if (now - lastFiredRef.current < 300) return;
    lastFiredRef.current = now;
    const rect = el.getBoundingClientRect();
    setPopup((prev) =>
      prev?.symbolId === symbolId && Math.abs(prev.rect.left - rect.left) < 4
        ? null
        : { symbolId, rect }
    );
  }, []);

  const tokens = tokenize(text);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.kind === "text") return <span key={i}>{token.content}</span>;

        const { kind, content, symbolId } = token;

        if (kind === "waqf") {
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-label="Waqf mark"
              onClick={(e) => { e.stopPropagation(); openPopup(symbolId, e.currentTarget); }}
              onPointerDown={(e) => { e.stopPropagation(); openPopup(symbolId, e.currentTarget); }}
              className="inline-block select-none font-arabic text-amber-500"
              style={{
                fontSize: "1.6em",
                verticalAlign: "0.35em",
                lineHeight: 1,
                cursor: "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                padding: "0 2px",
              }}
            >
              {content}
            </span>
          );
        }

        if (kind === "structural") {
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-label="Quranic symbol"
              onClick={(e) => { e.stopPropagation(); openPopup(symbolId, e.currentTarget); }}
              onPointerDown={(e) => { e.stopPropagation(); openPopup(symbolId, e.currentTarget); }}
              className="select-none font-arabic text-amber-500"
              style={{
                cursor: "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {content}
            </span>
          );
        }

        // Shaddah cluster — solid amber underline
        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            aria-label="Shaddah"
            onClick={(e) => { e.stopPropagation(); openPopup(symbolId, e.currentTarget); }}
            onPointerDown={(e) => { e.stopPropagation(); openPopup(symbolId, e.currentTarget); }}
            className="select-none underline decoration-amber-400/70 decoration-solid underline-offset-2"
            style={{
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {content}
          </span>
        );
      })}

      {popup && <SymbolPopup target={popup} onClose={() => setPopup(null)} />}
    </>
  );
}
