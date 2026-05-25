import { Fragment } from "react";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "is", "it",
  "wa", "fi", "min", "al", "il", "la",
]);

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export function highlightText(text: string, query: string) {
  const terms = queryTerms(query);
  if (!terms.length) return text;

  let parts: string[];
  try {
    const pattern = new RegExp(
      `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "gi"
    );
    parts = text.split(pattern);
  } catch {
    return text;
  }

  return parts.map((part, i) => {
    const isMatch = terms.some((t) => part.toLowerCase() === t.toLowerCase());
    if (!isMatch) return <Fragment key={i}>{part}</Fragment>;
    return (
      <mark
        key={i}
        className="rounded bg-accent-surface px-0.5 font-semibold text-ink"
      >
        {part}
      </mark>
    );
  });
}