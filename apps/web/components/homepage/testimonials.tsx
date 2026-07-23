import { Review } from "@/types";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

async function getReviews() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/reviews`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return await res.json() as Review[];
  } catch {}
  return [];
}

export async function TestimonialsSection() {
  const reviews = await getReviews();

  if (reviews.length === 0) {
    return <EmptyState title="No reviews yet" message="Member stories will appear here soon." />;
  }

  return (
    <section className="bg-neutral-100 py-16 dark:bg-neutral-900">
      <div className="mx-auto max-w-page px-6">
        <h2 className="text-2xl font-semibold text-primary-900 dark:text-white">What members say</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((r) => (
            <Card key={r.id} className="p-6 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < (r.rating || 0) ? "fill-accent-500 text-accent-500" : "text-neutral-300"}`}
                  />
                ))}
              </div>
              <p className="mt-4 text-neutral-900 dark:text-neutral-100">&ldquo;{r.outcome}&rdquo;</p>
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                — {r.name}, {r.role}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
