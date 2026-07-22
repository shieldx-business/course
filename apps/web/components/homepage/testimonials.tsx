import { Review } from "@/types";
import { Card } from "@/components/ui/card";

export async function TestimonialsSection() {
  let reviews: Review[] = [];
  try {
    const res = await fetch(`${process.env.API_BASE_URL || "http://localhost:8000"}/api/v1/reviews`, {
      next: { revalidate: 60 },
    });
    if (res.ok) reviews = await res.json();
  } catch {
    reviews = [];
  }

  return (
    <section className="bg-neutral-100 py-16">
      <div className="mx-auto max-w-page px-6">
        <h2 className="text-2xl font-semibold text-primary-900">What members say</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((r) => (
            <Card key={r.id} className="p-6">
              <p className="text-neutral-900">&ldquo;{r.outcome}&rdquo;</p>
              <p className="mt-4 text-sm text-neutral-600">
                — {r.name}, {r.role}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
