import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
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
          2,000+ courses · 50,000+ members · 1.2M hours learned · 4.8/5 average rating
        </p>
      </div>
    </section>
  );
}
