/** AyahFind design system tokens */
export const tokens = {
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    full: "9999px",
  },
  typography: {
    display: "clamp(1.75rem, 5vw, 2.5rem)",
    title: "clamp(1.25rem, 3vw, 1.5rem)",
    body: "1rem",
    caption: "0.8125rem",
    arabic: "clamp(1.375rem, 4vw, 1.75rem)",
  },
  motion: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    spring: { type: "spring" as const, stiffness: 380, damping: 32 },
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
  },
} as const;

export const placeholders = [
  "Recite an ayah imperfectly...",
  "Search by meaning...",
  "Try: hardship and ease",
  "Describe a hadith...",
  "Search in Arabic or English...",
  "fa inama al usri yusra",
];
