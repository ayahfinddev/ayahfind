import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
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
          emerald: "#0a0a0a",
          cyan: "#525252",
          glow: "#171717",
          teal: "#14b8a6",
          "teal-dim": "#0d9488",
        },
        reader: {
          bg: "#0b0e13",
          elevated: "#121820",
          card: "#161d27",
          border: "rgba(255, 255, 255, 0.08)",
          ink: "#f4f4f5",
          muted: "#a1a1aa",
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
      },
      fontSize: {
        body: ["1rem", { lineHeight: "1.65", letterSpacing: "-0.01em" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.6", letterSpacing: "-0.008em" }],
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
