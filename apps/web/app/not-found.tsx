import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category } from "@/types";

export const metadata = {
  title: "Page not found — Ascendly",
};

export default async function NotFoundPage() {
  let categories: Category[] = [];
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/categories`,
      { next: { revalidate: 60 } }
    );
    if (res.ok) categories = await res.json();
  } catch {
    categories = [];
  }

  return (
    <section className="flex flex-1 items-center justify-center py-20">
      <div className="mx-auto max-w-page px-6 text-center">
        <h1 className="text-6xl font-bold text-primary-900">404</h1>
        <p className="mt-4 text-xl text-neutral-900">We could not find that page.</p>
        <p className="mt-2 text-neutral-600">
          Search the library or explore popular categories below.
        </p>

        <form action="/courses" method="GET" className="mx-auto mt-8 flex max-w-md gap-2">
          <Input name="search" placeholder="Try 'Excel', 'leadership', or 'Python'…" className="flex-1" />
          <Button type="submit">Search</Button>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/">
            <Button>Go home</Button>
          </Link>
          <Link href="/courses">
            <Button variant="secondary">Browse courses</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary">View pricing</Button>
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="mt-12">
            <p className="text-sm font-medium text-neutral-900">Top categories</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {categories.slice(0, 7).map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-200"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
