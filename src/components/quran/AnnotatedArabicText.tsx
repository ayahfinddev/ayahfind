"use client";

import { useState, useEffect, useRef } from "react";
import { SymbolPopup, type SymbolId, type PopupTarget } from "./SymbolPopup";

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

  // Use native DOM listeners — bypasses React's synthetic event system entirely.
  // This is the most reliable approach across all browsers and devices.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let lastTime = 0;

    const handle = (e: PointerEvent) => {
      // debounce: ignore if fired within 300 ms of a previous trigger
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
            // inline-flex + minWidth guarantees a real hit box even if the
            // Noto Naskh glyph has near-zero advance width (which it does for
            // annotation characters like U+06D6-U+06DB).
            return (
              <span
                key={i}
                data-sid={symbolId}
                className="font-arabic text-amber-500"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2em",
                  minWidth: "1.4em",
                  minHeight: "1.4em",
                  verticalAlign: "0.4em",
                  lineHeight: 1,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "rgba(251,191,36,0.2)",
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
                data-sid={symbolId}
                className="font-arabic text-amber-500"
                style={{
                  cursor: "pointer",
                  display: "inline",
                  WebkitTapHighlightColor: "rgba(251,191,36,0.2)",
                }}
              >
                {content}
              </span>
            );
          }

          // shaddah — solid amber underline
          return (
            <span
              key={i}
              data-sid={symbolId}
              style={{
                cursor: "pointer",
                textDecoration: "underline",
                textDecorationColor: "rgba(251,191,36,0.7)",
                textDecorationStyle: "solid",
                textUnderlineOffset: "3px",
                WebkitTapHighlightColor: "rgba(251,191,36,0.2)",
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
