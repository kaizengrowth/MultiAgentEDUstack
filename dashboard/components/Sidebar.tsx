"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/", label: "Overview", code: "OV" },
  { href: "/sources", label: "Sources", code: "00" },
  { href: "/dispatches", label: "Dispatches", code: "01" },
  { href: "/bulletins", label: "Bulletins", code: "02" },
  { href: "/watch", label: "Watch", code: "03" },
  { href: "/curriculum", label: "Curriculum", code: "04" },
  { href: "/labs", label: "Labs", code: "05" },
  { href: "/editorial", label: "Editorial", code: "06" },
  { href: "/pipeline", label: "Pipeline", code: "07" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {SECTIONS.map((section) => {
        const active =
          section.href === "/"
            ? pathname === "/"
            : pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            className={`group flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-surface-raised text-ink"
                : "text-ink-secondary hover:text-ink hover:bg-surface-raised/60"
            }`}
          >
            <span
              className={`font-mono text-[10px] tracking-wider ${
                active ? "text-accent" : "text-ink-muted group-hover:text-ink-secondary"
              }`}
            >
              {section.code}
            </span>
            <span className={active ? "font-medium" : ""}>{section.label}</span>
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
