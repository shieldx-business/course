"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { Course, Lesson } from "@/types";

interface ContinueData {
  course_id: string;
  course_title: string;
  course_slug: string;
  lesson_id: string;
  lesson_title: string;
  lesson_index: number;
  lesson_count: number;
  last_position_seconds: number;
}

interface ProgressItem {
  course_id: string;
  lesson_id: string;
  completed: boolean;
  last_position_seconds: number;
}

function findShortLesson(courses: Course[]): { course: Course; lesson: Lesson } | null {
  const candidates: { course: Course; lesson: Lesson; duration: number }[] = [];
  for (const course of courses) {
    for (const lesson of course.syllabus) {
      if (lesson.duration_seconds > 0 && lesson.duration_seconds <= 300) {
        candidates.push({ course, lesson, duration: lesson.duration_seconds });
      }
    }
  }
  if (candidates.length) {
    candidates.sort((a, b) => a.duration - b.duration);
    return { course: candidates[0].course, lesson: candidates[0].lesson };
  }
  const course = courses[0];
  const lesson = course?.syllabus[0];
  if (course && lesson) return { course, lesson };
  return null;
}

export default function LearnDashboard() {
  const [continueData, setContinueData] = useState<ContinueData | null>(null);
  const [recommended, setRecommended] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState<{ course: Course; lesson: Lesson } | null>(null);

  useEffect(() => {
    apiFetch("/progress/continue")
      .then(setContinueData)
      .catch(() => {});

    apiFetch("/courses")
      .then((courses: Course[]) => {
        setRecommended(courses.slice(0, 3));
        if (typeof window !== "undefined" && !localStorage.getItem("ascendly_welcomed")) {
          apiFetch("/progress")
            .then((progress: ProgressItem[]) => {
              if (!progress.length) {
                const pick = findShortLesson(courses);
                if (pick) setOnboarding(pick);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dismissOnboarding = () => {
    if (typeof window !== "undefined") localStorage.setItem("ascendly_welcomed", "1");
    setOnboarding(null);
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Learning dashboard</h1>

        {loading ? (
          <p className="mt-6 text-neutral-600">Loading...</p>
        ) : continueData ? (
          <Card className="mt-6 p-6">
            <p className="text-sm text-neutral-600">Pick up where you left off:</p>
            <h2 className="mt-1 text-xl font-medium text-neutral-900">{continueData.course_title}</h2>
            <p className="text-sm text-neutral-600">
              {continueData.lesson_title} — Lesson {continueData.lesson_index + 1} of {continueData.lesson_count}
            </p>
            <Link href={`/learn/${continueData.course_slug}/${continueData.lesson_id}`}>
              <Button className="mt-4">Continue learning</Button>
            </Link>
          </Card>
        ) : (
          <Card className="mt-6 p-6">
            <p className="text-neutral-600">No courses in progress yet. Start one below.</p>
          </Card>
        )}

        <h2 className="mt-10 text-xl font-semibold text-primary-900">Recommended for you</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {recommended.map((c) => (
            <Card key={c.id} className="p-5">
              <p className="font-medium text-neutral-900">{c.title}</p>
              <p className="text-xs text-neutral-600">{c.category_name}</p>
              <Link href={`/learn/${c.slug}/${c.syllabus[0]?.id || ""}`}>
                <Button variant="secondary" className="mt-3 w-full">Start</Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {onboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md p-6">
            <h2 className="text-xl font-semibold text-primary-900">Let&apos;s get your first win in the next 5 minutes.</h2>
            <p className="mt-2 text-neutral-600">
              Pick a short lesson below and finish it now — momentum starts with one video, not a whole course.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/learn/${onboarding.course.slug}/${onboarding.lesson.id}`}
                className="flex-1"
                onClick={dismissOnboarding}
              >
                <Button className="w-full">Show me a 5-minute lesson</Button>
              </Link>
              <Button variant="secondary" className="flex-1" onClick={dismissOnboarding}>
                Maybe later
              </Button>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
