"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("maes-theme");
    const initial = stored === "light" ? "light" : "dark";
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
      aria-label={theme === "dark" ? "Switch to the paper edition" : "Switch to the night edition"}
      className="flex items-center gap-2 rounded border border-hairline px-2.5 py-1 text-[11px] uppercase tracking-wider text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
      {theme === "dark" ? "Night edition" : "Paper edition"}
    </button>
  );
}
