import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        hairline: "var(--hairline)",
        ink: "var(--ink)",
        "ink-secondary": "var(--ink-secondary)",
        "ink-muted": "var(--ink-muted)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        good: "var(--good)",
        warning: "var(--warning)",
        critical: "var(--critical)",
        tier1: "var(--tier1)",
        tier2: "var(--tier2)",
        tier3: "var(--tier3)",
        tier4: "var(--tier4)",
        tier5: "var(--tier5)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        panel: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
