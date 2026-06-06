"use client";

import { useState, useEffect, useRef } from "react";
import { SymbolPopup, type SymbolId, type PopupTarget } from "./SymbolPopup";

// ── Codepoints confirmed against the actual dataset ──────────────────────────
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

// Traditional Arabic abbreviation for each waqf mark.
// We render THIS text in the badge instead of the raw annotation glyph, because
// the annotation glyphs (U+06D6–U+06DB) have near-zero advance width and paint
// far above their em box in Noto Naskh Arabic — making reliable hit-testing
// impossible. Regular Arabic letters render predictably.
const WAQF_LABEL: Record<string, string> = {
  wasl_awla:    "صلى",
  waqf_awla:    "قلى",
  waqf_lazim:   "م",
  la_waqf:      "لا",
  waqf_jaiz:    "ج",
  muanaq:       "∴",
};

type Token =
  | { kind: "text"; content: string }
  | { kind: "waqf" | "structural" | "shaddah"; content: string; symbolId: SymbolId };

function tokenize(text: string): Token[] {
  const result: Token[] = [];
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

export function AnnotatedArabicText({ text }: { text: string }) {
  const [popup, setPopup] = useState<PopupTarget | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Native DOM listener — bypasses React's synthetic event system entirely
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let lastTime = 0;

    const handle = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastTime < 300) return;
      const target = (e.target as HTMLElement | null)?.closest?.("[data-sid]") as HTMLElement | null;
      if (!target) return;
      lastTime = now;
      e.stopPropagation();
      const symbolId = target.getAttribute("data-sid") as SymbolId;
      if (!symbolId) return;
      const rect = target.getBoundingClientRect();
      setPopup((prev) =>
        prev?.symbolId === symbolId && Math.abs(prev.rect.left - rect.left) < 4
          ? null
          : { symbolId, rect }
      );
    };

    el.addEventListener("pointerdown", handle);
    return () => el.removeEventListener("pointerdown", handle);
  }, []);

  const tokens = tokenize(text);

  return (
    <>
      <span ref={wrapperRef} style={{ touchAction: "manipulation" }}>
        {tokens.map((token, i) => {
          if (token.kind === "text") return <span key={i}>{token.content}</span>;

          const { kind, content, symbolId } = token;

          if (kind === "waqf") {
            // Amber pill badge with the traditional abbreviation text.
            // The badge itself is the icon AND the button — perfectly aligned.
            return (
              <span
                key={i}
                data-sid={symbolId}
                dir="rtl"
                lang="ar"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: '"Noto Naskh Arabic", serif',
                  fontSize: "0.52em",
                  lineHeight: 1,
                  minWidth: "1.6em",
                  padding: "1px 3px",
                  verticalAlign: "2.2em",
                  backgroundColor: "rgba(251,191,36,0.13)",
                  border: "1px solid rgba(251,191,36,0.4)",
                  borderRadius: "4px",
                  color: "rgb(146,64,14)",      // amber-900 for contrast
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitTapHighlightColor: "rgba(251,191,36,0.25)",
                }}
              >
                {WAQF_LABEL[symbolId] ?? content}
              </span>
            );
          }

          if (kind === "structural") {
            // ۞ hizb and ۩ sajdah render fine at normal size
            return (
              <span
                key={i}
                data-sid={symbolId}
                style={{
                  color: "rgb(180,83,9)",
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitTapHighlightColor: "rgba(251,191,36,0.25)",
                }}
              >
                {content}
              </span>
            );
          }

          // Shaddah cluster — solid amber underline under the cluster
          return (
            <span
              key={i}
              data-sid={symbolId}
              style={{
                cursor: "pointer",
                textDecoration: "underline",
                textDecorationColor: "rgba(251,191,36,0.65)",
                textDecorationStyle: "solid",
                textUnderlineOffset: "3px",
                userSelect: "none",
                WebkitTapHighlightColor: "rgba(251,191,36,0.25)",
              }}
            >
              {content}
            </span>
          );
        })}
      </span>

      {popup && <SymbolPopup target={popup} onClose={() => setPopup(null)} />}
    </>
  );
}
