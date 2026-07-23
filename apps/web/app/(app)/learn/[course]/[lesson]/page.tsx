"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Course, Lesson, Progress } from "@/types";

export default function CoursePlayerPage({ params }: { params: { course: string; lesson: string } }) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [params.course]);

  const current: Lesson | undefined = course?.syllabus.find((l) => l.id === params.lesson);
  const currentIndex = course?.syllabus.findIndex((l) => l.id === params.lesson) ?? 0;

  const lessonId = current?.id;
  useEffect(() => {
    if (!lessonId) return;
    apiFetch(`/lessons/${lessonId}/stream-token`, { method: "POST" })
      .then((data) => setVideoUrl(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1${data.stream_url}`))
      .catch((e) => setError(e.message));
  }, [lessonId]);

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
    // Lock if previous lesson not completed (except first)
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
                  className="h-full w-full"
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
