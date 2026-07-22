import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Course } from "@/types";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const search = typeof searchParams.search === "string" ? searchParams.search : "";
  let courses: Course[] = [];
  try {
    const res = await fetch(
      `${process.env.API_BASE_URL || "http://localhost:8000"}/api/v1/courses?search=${encodeURIComponent(search)}`,
      { next: { revalidate: 60 } }
    );
    if (res.ok) courses = await res.json();
  } catch {
    courses = [];
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Course library</h1>
        <p className="mt-2 text-neutral-600">{courses.length} courses included with every membership.</p>

        {search && (
          <p className="mt-4 text-sm text-neutral-600">
            Showing results for &ldquo;{search}&rdquo;
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.category_slug}/${course.slug}`}>
              <Card className="h-full p-5 hover:border-accent-500 transition-colors">
                <Badge variant="primary" className="text-xs">
                  {course.category_name}
                </Badge>
                <h3 className="mt-3 font-medium text-neutral-900">{course.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{course.description}</p>
                <p className="mt-4 text-xs text-neutral-600">{course.lesson_count} lessons</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
