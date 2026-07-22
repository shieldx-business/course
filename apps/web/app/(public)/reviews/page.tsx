import { Review } from "@/types";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

export default async function ReviewsPage() {
  let reviews: Review[] = [];
  try {
    const res = await fetch(
      `${process.env.API_BASE_URL || "http://localhost:8000"}/api/v1/reviews`,
      { next: { revalidate: 60 } }
    );
    if (res.ok) reviews = await res.json();
  } catch {
    reviews = [];
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Member reviews</h1>
        <p className="mt-2 text-neutral-600">Average rating: 4.8/5 from 50,000+ members.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-6">
              <div className="flex text-accent-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-neutral-900">&ldquo;{r.outcome}&rdquo;</p>
              <p className="mt-4 text-sm font-medium text-neutral-900">{r.name}</p>
              <p className="text-xs text-neutral-600">{r.role}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
