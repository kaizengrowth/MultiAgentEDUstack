"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/", label: "Overview" },
  { href: "/sources", label: "Sources" },
  { href: "/dispatches", label: "Dispatches" },
  { href: "/bulletins", label: "Bulletins" },
  { href: "/watch", label: "Watch" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/labs", label: "Labs" },
  { href: "/editorial", label: "Editorial" },
  { href: "/pipeline", label: "Pipeline" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-5" aria-label="Main">
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
        Browse
      </p>
      {SECTIONS.map((section) => {
        const active =
          section.href === "/"
            ? pathname === "/"
            : pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            data-active={active}
            className={`nav-link px-3 py-2 text-sm ${
              active
                ? "font-bold text-ink"
                : "text-ink-secondary hover:bg-surface-raised/70 hover:text-ink"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
