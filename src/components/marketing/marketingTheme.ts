import type { CSSProperties } from "react";

/** Fixed cinematic palette for the marketing homepage.
 *
 * The landing page always presents in the brand's "Forest Night" look — it
 * must not shift with the visitor's in-app theme preference (a first-time
 * visitor has none, and a marketing page changing palette underneath the
 * scroll narrative reads as a glitch). These are the exact `[data-theme=
 * "dark"]` token values from globals.css, re-declared inline on the page
 * root so every existing Tailwind token class (`bg-surface`, `text-text`,
 * `border-border`, ...) resolves to Night values inside the page — which is
 * also what makes the result-card replica pixel-faithful to the real app.
 */
export const MARKETING_THEME_VARS: CSSProperties = {
  "--background": "#101713",
  "--background-rgb": "16 23 19",
  "--surface": "#17211b",
  "--surface-rgb": "23 33 27",
  "--surface-secondary": "#1a251e",
  "--surface-secondary-rgb": "26 37 30",
  "--surface-elevated": "#1d2922",
  "--surface-elevated-rgb": "29 41 34",
  "--surface-floating": "#202d25",
  "--surface-floating-rgb": "32 45 37",
  "--text": "#f3efe6",
  "--text-rgb": "243 239 230",
  "--text-secondary": "#c5beb1",
  "--text-secondary-rgb": "197 190 177",
  "--text-tertiary": "#938c81",
  "--text-tertiary-rgb": "147 140 129",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--border-strong": "rgba(255, 255, 255, 0.14)",
  "--glass-border": "rgba(255, 255, 255, 0.08)",
  "--glass-fill": "rgba(16, 23, 19, 0.9)",
  "--primary": "#73a781",
  "--primary-rgb": "115 167 129",
  "--primary-hover": "#84b792",
  "--primary-hover-rgb": "132 183 146",
  "--accent-surface": "rgba(115, 167, 129, 0.12)",
  "--accent-border": "rgba(115, 167, 129, 0.28)",
  "--highlight": "#c5a15b",
  "--highlight-rgb": "197 161 91",
  "--highlight-surface": "rgba(197, 161, 91, 0.16)",
  "--highlight-border": "rgba(197, 161, 91, 0.4)",
  "--image-overlay": "rgba(16, 23, 19, 0.8)",
  // Aliases the component layer relies on (globals.css maps these to the
  // semantic tokens at :root — re-map them here so the overrides cascade).
  "--canvas": "#101713",
  "--elevated": "#17211b",
  "--card": "#1a251e",
  "--ink": "#f3efe6",
  "--muted": "#c5beb1",
  "--subtle": "#938c81",
  "--accent": "#73a781",
  "--accent-dim": "#84b792",
  "--gold": "#c5a15b",
  "--gold-rgb": "197 161 91",
  "--shadow-xs": "0 1px 2px rgba(0, 0, 0, 0.3)",
  "--shadow-sm": "0 4px 16px rgba(0, 0, 0, 0.35)",
  "--shadow-md": "0 12px 40px rgba(0, 0, 0, 0.45)",
  "--shadow-card": "0 4px 16px rgba(0, 0, 0, 0.35)",
} as CSSProperties;
