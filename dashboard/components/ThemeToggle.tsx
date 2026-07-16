"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const stored = localStorage.getItem("maes-theme");
    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("maes-theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to daytime view" : "Switch to evening view"
      }
      className="rounded-full border border-hairline bg-surface-raised px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:border-accent hover:text-ink"
    >
      {theme === "dark" ? "Evening" : "Daytime"}
    </button>
  );
}
