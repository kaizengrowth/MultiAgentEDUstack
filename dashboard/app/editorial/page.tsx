import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { query } from "@/lib/db";
import { EditorialReview } from "@/lib/types";

export const dynamic = "force-dynamic";

type PendingUnit = {
  id: number;
  title: string;
  status: string;
  created_at: string;
  competency: string;
};

function targetHref(type: string, id: number): string | null {
  if (type === "curriculum_unit") return `/curriculum/${id}`;
  if (type === "lab_spec") return `/labs/${id}`;
  if (type === "digest") return `/bulletins/${id}`;
  return null;
}

export default async function EditorialPage() {
  const [pending, reviews] = await Promise.all([
    query<PendingUnit>(
      `SELECT cu.id, cu.title, cu.status, cu.created_at, cu.competency
       FROM curriculum_units cu
       LEFT JOIN editorial_reviews er
         ON er.target_type = 'curriculum_unit' AND er.target_id = cu.id
       WHERE er.id IS NULL AND cu.status = 'drafted'
       ORDER BY cu.created_at ASC`
    ),
    query<EditorialReview>(
      `SELECT * FROM editorial_reviews
       ORDER BY (reviewed_at IS NULL), reviewed_at DESC, id DESC`
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editorial"
        description="Human-gated review queue. Approved decisions are never recorded without a human."
        meta={`${pending.length} awaiting · ${reviews.length} decided`}
      />

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Awaiting review
        </h2>
        {pending.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Editorial queue is clear." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-hairline rounded border border-hairline bg-surface">
            {pending.map((unit) => (
              <li
                key={unit.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/curriculum/${unit.id}`}
                    className="text-sm text-ink hover:text-accent"
                  >
                    {unit.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                    {unit.competency.replace(/_/g, " ")} · {unit.created_at}
                  </p>
                </div>
                <StatusBadge value={unit.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          Past decisions
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No reviews recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline rounded border border-hairline bg-surface">
            {reviews.map((review) => {
              const href = targetHref(review.target_type, review.target_id);
              return (
                <li key={review.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-ink">
                      {href ? (
                        <Link href={href} className="hover:text-accent">
                          {review.target_type.replace(/_/g, " ")} #
                          {review.target_id}
                        </Link>
                      ) : (
                        <span>
                          {review.target_type} #{review.target_id}
                        </span>
                      )}
                    </div>
                    <StatusBadge value={review.decision} />
                  </div>
                  {(review.pedagogical_notes || review.technical_notes) && (
                    <div className="mt-2 space-y-1 text-sm text-ink-secondary">
                      {review.pedagogical_notes && (
                        <p>
                          <span className="font-mono text-[11px] text-ink-muted">
                            pedagogical:{" "}
                          </span>
                          {review.pedagogical_notes}
                        </p>
                      )}
                      {review.technical_notes && (
                        <p>
                          <span className="font-mono text-[11px] text-ink-muted">
                            technical:{" "}
                          </span>
                          {review.technical_notes}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="mt-2 font-mono text-[11px] text-ink-muted">
                    {review.reviewed_at || "decision pending timestamp"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
