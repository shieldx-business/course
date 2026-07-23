import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Progress } from "@/types";

interface ProgressSummary {
  course_id: string;
  course_title: string;
  course_slug: string;
  completed_lessons: number;
  total_lessons: number;
  progress_pct: number;
}

interface ContinueLesson {
  course_id: string;
  course_title: string;
  course_slug: string;
  lesson_id: string;
  lesson_title: string;
  lesson_index: number;
  lesson_count: number;
  last_position_seconds: number;
}

export function useProgressSummary() {
  const [summary, setSummary] = useState<ProgressSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/progress/summary")
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load progress");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { summary, loading, error };
}

export function useContinueLesson() {
  const [continueLesson, setContinueLesson] = useState<ContinueLesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/progress/continue")
      .then((data) => {
        if (!cancelled) setContinueLesson(data);
      })
      .catch(() => {
        if (!cancelled) setContinueLesson(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { continueLesson, loading };
}

export function useLessonProgress(lessonId: string | undefined) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/progress/${lessonId}`);
      setProgress(data);
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updateProgress = useCallback(
    async (payload: { completed?: boolean; last_position_seconds?: number; note?: string }) => {
      if (!lessonId) return;
      const data = await apiFetch(`/progress/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setProgress(data);
      return data;
    },
    [lessonId]
  );

  return { progress, loading, updateProgress, refresh: fetchProgress };
}
