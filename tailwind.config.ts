import type { Config } from "tailwindcss";

// Tailwind's opacity modifiers (`bg-surface/95`) only work on colors defined
// this way — a plain `var(--x)` hex string can't have an alpha channel
// injected by a `/NN` suffix, so `bg-surface/95` silently produced a fully
// transparent background. Every color that ever needs `/NN` gets a matching
// `--x-rgb: R G B` triple in globals.css.
// Tailwind's `Config` color type only declares strings — it doesn't know
// about the function-color form its own runtime accepts, so this cast is
// the standard workaround (Tailwind's docs use the same function shape).
function withOpacity(rgbVarName: string): string {
  return ((({ opacityValue }: { opacityValue?: string }) =>
    opacityValue !== undefined
      ? `rgb(var(${rgbVarName}) / ${opacityValue})`
      : `rgb(var(${rgbVarName}))`) as unknown) as string;
}

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic layer (preferred for new code) — see docs/DESIGN_SYSTEM.md
        // Opacity-aware (see `withOpacity` above) since these are used with
        // `/NN` modifiers (e.g. `bg-surface/95`, `bg-error/10`).
        background: withOpacity("--background-rgb"),
        surface: {
          DEFAULT: withOpacity("--surface-rgb"),
          secondary: withOpacity("--surface-secondary-rgb"),
          elevated: withOpacity("--surface-elevated-rgb"),
          floating: withOpacity("--surface-floating-rgb"),
        },
        text: {
          DEFAULT: withOpacity("--text-rgb"),
          secondary: withOpacity("--text-secondary-rgb"),
          tertiary: withOpacity("--text-tertiary-rgb"),
        },
        primary: {
          DEFAULT: withOpacity("--primary-rgb"),
          hover: withOpacity("--primary-hover-rgb"),
        },
        secondary: withOpacity("--secondary-rgb"),
        gold: withOpacity("--gold-rgb"),
        success: withOpacity("--success-rgb"),
        warning: withOpacity("--warning-rgb"),
        error: withOpacity("--error-rgb"),
        highlight: {
          DEFAULT: withOpacity("--highlight-rgb"),
          // Already translucent (rgba baked in) — not opacity-modifier-safe,
          // used as-is without a `/NN` suffix anywhere.
          surface: "var(--highlight-surface)",
          border: "var(--highlight-border)",
        },

        // Back-compat aliases — existing classNames keep resolving unchanged
        canvas: {
          DEFAULT: "var(--canvas)",
          elevated: "var(--elevated)",
          card: "var(--card)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--muted)",
          subtle: "var(--subtle)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          surface: "var(--accent-surface)",
          border: "var(--accent-border)",
          teal: "#14b8a6",
          "teal-dim": "#0d9488",
        },
        glass: {
          border: "var(--glass-border)",
          fill: "var(--glass-fill)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        arabic: ['"Noto Naskh Arabic"', "Amiri", "serif"],
        serif: ['"Lora"', "Georgia", "serif"],
      },
      fontSize: {
        "heading-lg": ["2rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.015em", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.65", letterSpacing: "-0.01em" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.6", letterSpacing: "-0.008em" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0" }],
        "arabic-md": ["1.8rem", { lineHeight: "1.9" }],
        "arabic-lg": ["2.2rem", { lineHeight: "1.9" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "18": "4.5rem",
      },
      borderRadius: {
        // lg (8px) and xl (12px) already match the sm/md design tiers by
        // Tailwind default — only 2xl needs nudging to hit the lg tier (20px).
        "2xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06)",
        "glow-lg": "0 0 0 1px rgba(0, 0, 0, 0.08), 0 16px 40px rgba(0, 0, 0, 0.08)",
        card: "var(--shadow-card)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.85" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
