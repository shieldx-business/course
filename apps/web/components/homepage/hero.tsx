import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Stats {
  total_courses: number;
  total_members: number;
  total_hours: number;
  average_rating: number;
}

async function getStats(): Promise<Stats> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/stats`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return await res.json();
  } catch {}
  return { total_courses: 2000, total_members: 50000, total_hours: 1200000, average_rating: 4.8 };
}

export async function HeroSection() {
  const stats = await getStats();
  return (
    <section className="bg-primary-700 py-20 text-white md:py-28">
      <div className="mx-auto max-w-page px-6 text-center">
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          One membership. Every skill you&apos;ll ever need.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-100">
          2,000+ expert-led courses in business, tech, design, and data — all in one place, built for
          people who learn on their own schedule.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/pricing">
            <Button size="lg" className="w-full sm:w-auto">
              Start learning today
            </Button>
          </Link>
          <Link href="/courses">
            <Button size="lg" variant="secondary" className="w-full border-white/20 text-white hover:bg-white/10 sm:w-auto">
              Browse courses
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-300">
          {stats.total_courses.toLocaleString()}+ courses · {stats.total_members.toLocaleString()}+ members · {stats.total_hours.toLocaleString()}+ hours learned · {stats.average_rating}/5 average rating
        </p>
      </div>
    </section>
  );
}
