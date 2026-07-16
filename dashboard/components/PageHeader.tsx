export function PageHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="font-display text-[2rem] leading-tight text-ink sm:text-[2.35rem]">
          {title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-secondary sm:text-[1.05rem]">
          {description}
        </p>
      </div>
      {meta && <p className="chip">{meta}</p>}
    </div>
  );
}
