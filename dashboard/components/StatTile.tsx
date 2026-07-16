import Link from "next/link";

export function StatTile({
  label,
  value,
  sublabel,
  href,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-sm font-medium text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-3xl text-ink group-hover:text-accent">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-sm leading-snug text-ink-secondary">
          {sublabel}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="stat-tile group block px-4 py-4 no-underline outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {body}
      </Link>
    );
  }

  return <div className="stat-tile px-4 py-4">{body}</div>;
}
