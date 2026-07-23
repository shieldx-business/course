"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Course, Lesson, Progress } from "@/types";

interface Subscription {
  id: string;
  status: string;
  ends_at: string;
}

export default function CoursePlayerPage({ params }: { params: { course: string; lesson: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/courses/${params.course}`)
      .then(setCourse)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    apiFetch("/progress")
      .then((items: Progress[]) => {
        const map: Record<string, Progress> = {};
        items.forEach((p) => (map[p.lesson_id] = p));
        setProgress(map);
      })
      .catch(() => {});

    apiFetch("/subscriptions/me")
      .then(setSubscription)
      .catch(() => {});
  }, [params.course]);

  const current: Lesson | undefined = course?.syllabus.find((l) => l.id === params.lesson);
  const currentIndex = course?.syllabus.findIndex((l) => l.id === params.lesson) ?? 0;

  const trialActive = !!user?.trial_active && !!user?.trial_expires && new Date(user.trial_expires) > new Date();
  const trialUnlockCount = course ? Math.max(1, Math.ceil(course.syllabus.length * 0.1)) : 0;

  const hasAccess = useCallback(
    (lessonIndex: number) => {
      if (user?.role === "admin" || subscription?.status === "active") return true;
      if (trialActive) return lessonIndex < trialUnlockCount;
      return false;
    },
    [user, subscription, trialActive, trialUnlockCount]
  );

  useEffect(() => {
    if (!current || !hasAccess(currentIndex)) return;
    setVideoUrl(null);
    setError("");
    apiFetch(`/lessons/${current.id}/stream-token`, { method: "POST" })
      .then((data) => setVideoUrl(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1${data.stream_url}`))
      .catch((e) => setError(e.message));
  }, [current, currentIndex, hasAccess]);

  const updateProgress = (completed: boolean, last_position_seconds: number) => {
    if (!current) return;
    apiFetch(`/progress/${current.id}`, {
      method: "PUT",
      body: JSON.stringify({ completed, last_position_seconds }),
    }).then((p: Progress) => {
      setProgress((prev) => ({ ...prev, [current.id]: p }));
    });
  };

  const isLocked = (lesson: Lesson) => {
    const idx = course?.syllabus.findIndex((l) => l.id === lesson.id) ?? 0;
    if (!hasAccess(idx)) return true;
    if (idx === 0) return false;
    const prev = course?.syllabus[idx - 1];
    return prev ? !progress[prev.id]?.completed : false;
  };

  const goToLesson = (lesson: Lesson) => {
    if (isLocked(lesson)) return;
    router.push(`/learn/${params.course}/${lesson.id}`);
  };

  if (loading) return <p className="py-20 text-center text-neutral-600">Loading course...</p>;
  if (!course || !current) return <p className="py-20 text-center text-error">{error || "Course not found"}</p>;

  if (!hasAccess(currentIndex)) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-primary-900">This lesson is locked</h1>
        <p className="mt-2 text-neutral-600">
          {trialActive
            ? "Your free preview covers the first 10% of this course. Subscribe to unlock the full library."
            : "Verify your phone for a 3-day preview, or subscribe for full access."}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          {!trialActive && (
            <Link href={`/verify-phone?next=/learn/${params.course}/${params.lesson}`}>
              <Button>Start free preview</Button>
            </Link>
          )}
          <Link href="/pricing">
            <Button variant="secondary">See plans</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      <div className="mx-auto max-w-page px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="aspect-video rounded-lg bg-neutral-900 flex items-center justify-center overflow-hidden">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  controlsList="nodownload"
                  className="h-full w-full select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
                      e.preventDefault();
                    }
                  }}
                  onTimeUpdate={(e) => updateProgress(false, Math.floor(e.currentTarget.currentTime))}
                  onEnded={() => updateProgress(true, 0)}
                />
              ) : (
                <p className="text-center text-neutral-300">{error || "Loading video..."}</p>
              )}
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-primary-900">{current.title}</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Lesson {currentIndex + 1} of {course.lesson_count}
            </p>
          </div>
          <Card className="h-fit p-5">
            <h2 className="font-semibold text-primary-900">{course.title}</h2>
            <ul className="mt-4 space-y-3">
              {course.syllabus.map((l, idx) => {
                const locked = isLocked(l);
                const completed = progress[l.id]?.completed;
                return (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <button
                      onClick={() => goToLesson(l)}
                      className={`text-left ${locked ? "text-neutral-400" : l.id === params.lesson ? "font-medium text-accent-600" : "text-neutral-900"}`}
                      disabled={locked}
                    >
                      {idx + 1}. {l.title}
                    </button>
                    {completed ? <Check className="h-4 w-4 text-success" /> : locked ? <Lock className="h-4 w-4 text-neutral-300" /> : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
