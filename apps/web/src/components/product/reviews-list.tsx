import { Star } from "lucide-react";
import type { Review } from "@/server/queries/catalog";

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= rating ? "size-3.5 fill-ink text-ink" : "size-3.5 text-line"} strokeWidth={1.5} aria-hidden />
      ))}
    </span>
  );
}

/** Approved reviews only; callers render nothing when the list is empty. */
export function ReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {reviews.map((r) => (
        <li key={r.id} className="border-t border-line pt-6">
          <Stars rating={r.rating} />
          {r.title && <p className="text-body mt-3 font-medium">{r.title}</p>}
          <blockquote className="text-body mt-2 text-taupe">{r.body}</blockquote>
          <p className="text-small mt-4">
            {r.author}
            <span className="text-stone">
              {" "}
              · {new Date(r.createdAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}
