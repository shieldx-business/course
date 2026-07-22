import Link from "next/link";
import { Card } from "@/components/ui/card";

const posts = [
  { slug: "learn-excel-promotion", title: "How to learn Excel for a promotion", excerpt: "The five Excel skills managers actually notice." },
  { slug: "power-bi-without-degree", title: "Learn Power BI without going back to school", excerpt: "A structured path from first chart to team reporting." },
  { slug: "career-change-ux", title: "Career change: from receptionist to junior UX designer", excerpt: "Real skills, a realistic timeline, and how to build proof of work." },
];

export default function BlogPage() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Ascendly Blog</h1>
        <p className="mt-2 text-neutral-600">Career growth, skill guides, and how to learn faster.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`}>
              <Card className="h-full p-6 hover:border-accent-500 transition-colors">
                <h2 className="font-medium text-neutral-900">{p.title}</h2>
                <p className="mt-2 text-sm text-neutral-600">{p.excerpt}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
