import { Course } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Lock, Play } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { makeMetadata, SITE_URL } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: { course: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  let course: Course | null = null;
  try {
    const res = await fetch(`${apiBase}/api/v1/courses/${params.course}`, { next: { revalidate: 60 } });
    if (res.ok) course = await res.json();
  } catch {}

  return makeMetadata({
    title: `${course?.title || params.course} — Ascendly Course`,
    description: course?.description || "Learn this skill with Ascendly.",
    path: `/courses/${course?.category_slug || "category"}/${course?.slug || params.course}`,
  });
}

export default async function CourseDetailPage({ params }: { params: { category: string; course: string } }) {
  let res;
  try {
    res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/courses/${params.course}`,
      { next: { revalidate: 60 } }
    );
  } catch {
    res = { ok: false } as any;
  }
  if (!res.ok) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-2xl font-semibold">Course not found</h1>
      </section>
    );
  }
  const course: Course = await res.json();

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    provider: {
      "@type": "Organization",
      name: "Ascendly",
      sameAs: SITE_URL,
    },
    educationalProgramMode: "online",
    hasCourseInstance: course.syllabus.map((lesson) => ({
      "@type": "CourseInstance",
      courseMode: "online",
      name: lesson.title,
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Courses", item: `${SITE_URL}/courses` },
      { "@type": "ListItem", position: 3, name: course.category_name, item: `${SITE_URL}/courses/${course.category_slug}` },
      { "@type": "ListItem", position: 4, name: course.title, item: `${SITE_URL}/courses/${course.category_slug}/${course.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={[courseSchema, breadcrumb]} />
      <section className="py-12">
        <div className="mx-auto max-w-page px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Badge variant="primary">{course.category_name}</Badge>
              <h1 className="mt-3 text-3xl font-semibold text-primary-900">{course.title}</h1>
              <p className="mt-4 text-neutral-600">{course.description}</p>

              <div className="mt-8 aspect-video rounded-lg bg-neutral-900 flex items-center justify-center text-white">
                <div className="text-center">
                  <Lock className="mx-auto h-10 w-10 text-neutral-300" />
                  <p className="mt-3 font-medium">This lesson is part of your Ascendly membership.</p>
                  <p className="mt-1 text-sm text-neutral-300">
                    Verify your phone number to preview 10% of this course free for 3 days — no card required.
                  </p>
                  <Link href={`/verify-phone?next=/learn/${course.slug}/${course.syllabus[0]?.id}`}>
                    <Button className="mt-5 bg-accent-500 hover:bg-accent-600 text-white">
                      <Play className="mr-2 h-4 w-4" /> Start free preview
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-10">
                <h2 className="text-xl font-semibold text-primary-900">What you&apos;ll learn</h2>
                <ul className="mt-4 grid gap-2 md:grid-cols-2">
                  {course.outcome.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-900">
                      <span className="text-accent-600">•</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <Card className="p-5">
                <h2 className="font-semibold text-primary-900">Syllabus</h2>
                <ul className="mt-4 space-y-3">
                  {course.syllabus.map((lesson, idx) => (
                    <li key={lesson.id} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">
                        {idx + 1}. {lesson.title}
                      </span>
                      <Lock className="h-4 w-4 text-neutral-300" />
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className="mt-6 block">
                  <Button className="w-full">Unlock full course</Button>
                </Link>
                <p className="mt-3 text-center text-xs text-neutral-600">
                  Already a member? <Link href="/login" className="text-primary-700 hover:underline">Log in</Link>
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
