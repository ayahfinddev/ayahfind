"use client";

import { useState, useCallback } from "react";
import { SymbolPopup, type SymbolId, type PopupTarget } from "./SymbolPopup";

// ─── Codepoint → symbol id ────────────────────────────────────────────────────
// Waqf/structural marks in this dataset are dedicated Unicode Quranic annotation
// characters that appear as space-separated tokens — NOT regular Arabic letters.
const CP_TO_ID: Record<number, SymbolId> = {
  0x06d6: "wasl_awla",   // ۖ  صلى
  0x06d7: "waqf_awla",   // ۗ  قلى
  0x06d8: "waqf_lazim",  // ۘ  م
  0x06d9: "la_waqf",     // ۙ  لا
  0x06da: "waqf_jaiz",   // ۚ  ج
  0x06db: "muanaq",      // ۛ  معانقة
  0x06de: "hizb",        // ۞
  0x06e9: "sajdah",      // ۩
};

const WAQF_CPS = new Set([0x06d6, 0x06d7, 0x06d8, 0x06d9, 0x06da, 0x06db]);

type Token =
  | { kind: "text"; content: string }
  | { kind: "waqf" | "structural" | "shaddah"; content: string; symbolId: SymbolId };

function tokenize(text: string): Token[] {
  const result: Token[] = [];
  // [ۖ-ۛ] = U+06D6–U+06DB  ۞ = U+06DE  ۩ = U+06E9
  // Shaddah cluster: Arabic char + optional diacritics (excl shaddah U+0651) + shaddah
  const re = /([ۖ-ۛ۞۩]|[؀-ۿ][ً-ِْ-ٟ]*ّ[ً-ِْ-ٟ]*)/g;
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

  // Single delegated handler — no interactive elements inside the <p> tag.
  // Finds the nearest ancestor span that carries a data-sid attribute.
  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-sid]");
    if (!el) return;
    const symbolId = el.dataset.sid as SymbolId;
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
      {/* Wrapper span carries the single onClick — no buttons inside <p> */}
      <span onClick={handleClick} style={{ touchAction: "manipulation" }}>
        {tokens.map((token, i) => {
          if (token.kind === "text") return <span key={i}>{token.content}</span>;

          const { kind, content, symbolId } = token;

          if (kind === "waqf") {
            return (
              <span
                key={i}
                data-sid={symbolId}
                className="inline-block cursor-pointer font-arabic text-[0.9em] leading-none text-amber-500"
                style={{ verticalAlign: "0.55em" }}
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
                className="cursor-pointer font-arabic text-amber-500"
              >
                {content}
              </span>
            );
          }

          // shaddah — solid amber underline under the whole cluster
          return (
            <span
              key={i}
              data-sid={symbolId}
              className="cursor-pointer underline decoration-amber-400/70 decoration-solid underline-offset-2"
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
