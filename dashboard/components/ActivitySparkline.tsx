interface Point {
  date: string;
  count: number;
}

export function ActivitySparkline({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <div className="text-[12px] text-ink-muted">No ingest activity yet.</div>;
  }

  const width = 560;
  const height = 120;
  const padX = 8;
  const padY = 14;
  const max = Math.max(1, ...points.map((p) => p.count));

  const stepX = (width - padX * 2) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = height - padY - (p.count / max) * (height - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padY} L ${coords[0].x.toFixed(1)} ${height - padY} Z`;

  const last = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Items landed per day over the last ${points.length} days, most recent ${last.count}`}
    >
      {/* recessive baseline */}
      <line
        x1={padX}
        y1={height - padY}
        x2={width - padX}
        y2={height - padY}
        stroke="var(--hairline)"
        strokeWidth={1}
      />
      <path d={areaPath} fill="var(--accent)" fillOpacity={0.12} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={3} fill="var(--accent)" />
      <text
        x={Math.max(padX, last.x - 18)}
        y={Math.max(10, last.y - 8)}
        fontSize={11}
        fontFamily="var(--font-mono)"
        fill="var(--ink-secondary)"
      >
        {last.count}
      </text>
    </svg>
  );
}
