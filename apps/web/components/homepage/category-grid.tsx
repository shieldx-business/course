import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Category } from "@/types";
import { BarChart3, Brain, Code, Palette, Database, Briefcase, Users } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "marketing": <Briefcase className="h-6 w-6" />,
  "ai": <Brain className="h-6 w-6" />,
  "programming": <Code className="h-6 w-6" />,
  "design": <Palette className="h-6 w-6" />,
  "data": <Database className="h-6 w-6" />,
  "business": <BarChart3 className="h-6 w-6" />,
  "career": <Users className="h-6 w-6" />,
};

export async function CategoryGrid() {
  let categories: Category[] = [];
  try {
    const res = await fetch(`${process.env.API_BASE_URL || "http://localhost:8000"}/api/v1/categories`, {
      next: { revalidate: 60 },
    });
    if (res.ok) categories = await res.json();
  } catch {
    categories = [];
  }

  return (
    <section className="bg-neutral-100 py-16">
      <div className="mx-auto max-w-page px-6">
        <h2 className="text-2xl font-semibold text-primary-900">
          Whatever you&apos;re trying to get better at, it&apos;s in here.
        </h2>
        <p className="mt-2 max-w-2xl text-neutral-600">
          Marketing, AI, programming, design, data, business, and career skills — organized so you
          find what you need in seconds, not scrolls.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/courses/${cat.slug}`}>
              <Card className="p-4 hover:border-accent-500 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-accent-600">{iconMap[cat.slug] || <Briefcase />}</div>
                  <div>
                    <p className="font-medium text-neutral-900">{cat.name}</p>
                    <p className="text-xs text-neutral-600">{cat.course_count}+ courses</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
