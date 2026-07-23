"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface Attachment {
  title: string;
  url: string;
}

interface Lesson {
  id: string;
  title: string;
  order: number;
  duration_seconds: number;
  drive_file_id?: string;
  attachments?: Attachment[];
}

interface Course {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  slug: string;
  description: string;
  lesson_count: number;
  syllabus: Lesson[];
  outcome: string[];
}

interface Category {
  id: string;
  name: string;
}

interface DriveFile {
  id: string;
  name: string;
}

function emptyLesson(): Lesson {
  return {
    id: `lesson-${Date.now()}`,
    title: "",
    order: 0,
    duration_seconds: 0,
    drive_file_id: "",
  };
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category_id: "", title: "", slug: "", description: "" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Course>>({});

  useEffect(() => {
    Promise.all([
      apiFetch("/admin/courses"),
      apiFetch("/categories"),
      apiFetch("/admin/drive/files"),
    ])
      .then(([c, cats, d]) => {
        setCourses(c);
        setCategories(cats);
        setDriveFiles(d.files || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/admin/courses", {
        method: "POST",
        body: JSON.stringify({ ...form, syllabus: [], outcome: [] }),
      });
      const updated = await apiFetch("/admin/courses");
      setCourses(updated);
      setForm({ category_id: "", title: "", slug: "", description: "" });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const remove = async (id: string) => {
    await apiFetch(`/admin/courses/${id}`, { method: "DELETE" });
    setCourses(courses.filter((c) => c.id !== id));
  };

  const toggleExpand = (course: Course) => {
    if (expanded === course.id) {
      setExpanded(null);
      return;
    }
    setExpanded(course.id);
    if (!drafts[course.id]) {
      setDrafts({ ...drafts, [course.id]: { ...course } });
    }
  };

  const updateDraft = (courseId: string, updates: Partial<Course>) => {
    setDrafts((prev) => ({
      ...prev,
      [courseId]: { ...prev[courseId], ...updates },
    }));
  };

  const updateLesson = (courseId: string, lessonId: string, updates: Partial<Lesson>) => {
    setDrafts((prev) => {
      const draft = { ...prev[courseId] };
      draft.syllabus = draft.syllabus.map((l) => (l.id === lessonId ? { ...l, ...updates } : l));
      return { ...prev, [courseId]: draft };
    });
  };

  const addLesson = (courseId: string) => {
    setDrafts((prev) => {
      const draft = { ...prev[courseId] };
      draft.syllabus = [...draft.syllabus, { ...emptyLesson(), order: draft.syllabus.length + 1 }];
      return { ...prev, [courseId]: draft };
    });
  };

  const removeLesson = (courseId: string, lessonId: string) => {
    setDrafts((prev) => {
      const draft = { ...prev[courseId] };
      draft.syllabus = draft.syllabus.filter((l) => l.id !== lessonId);
      return { ...prev, [courseId]: draft };
    });
  };

  const saveCourse = async (courseId: string) => {
    setError("");
    const draft = drafts[courseId];
    if (!draft) return;
    try {
      await apiFetch(`/admin/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({
          category_id: draft.category_id,
          title: draft.title,
          slug: draft.slug,
          description: draft.description,
          syllabus: draft.syllabus.map((l) => ({
            id: l.id,
            title: l.title,
            order: l.order,
            duration_seconds: l.duration_seconds,
            drive_file_id: l.drive_file_id || null,
          })),
          outcome: draft.outcome.filter(Boolean),
        }),
      });
      const updated = await apiFetch("/admin/courses");
      setCourses(updated);
      const fresh = updated.find((c: Course) => c.id === courseId);
      if (fresh) setDrafts({ ...drafts, [courseId]: fresh });
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="py-12">
      <div>
        <h1 className="text-3xl font-semibold text-primary-900">Course management</h1>

        <Card className="mt-6 p-6">
          <h2 className="font-medium text-neutral-900">Add course</h2>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-2">
            <Input placeholder="Category ID" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required />
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <Button type="submit" className="md:col-span-2">Create course</Button>
          </form>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="font-medium text-neutral-900">Courses</h2>
          {loading ? (
            <p className="mt-3 text-sm text-neutral-600">Loading...</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {courses.map((c) => (
                <li key={c.id} className="border-b border-neutral-100 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{c.title}</p>
                      <p className="text-xs text-neutral-600">{c.category_name} · {c.lesson_count} lessons</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleExpand(c)}>
                        {expanded === c.id ? "Hide" : "Edit"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => remove(c.id)}>Delete</Button>
                    </div>
                  </div>

                  {expanded === c.id && drafts[c.id] && (
                    <div className="mt-4 space-y-4 rounded-md bg-neutral-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Input
                          value={drafts[c.id].title}
                          onChange={(e) => updateDraft(c.id, { title: e.target.value })}
                          placeholder="Course title"
                        />
                        <select
                          className="rounded-md border border-neutral-300 p-2 text-sm"
                          value={drafts[c.id].category_id}
                          onChange={(e) => updateDraft(c.id, { category_id: e.target.value })}
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <textarea
                          className="rounded-md border border-neutral-300 p-2 text-sm md:col-span-2"
                          rows={3}
                          value={drafts[c.id].description}
                          onChange={(e) => updateDraft(c.id, { description: e.target.value })}
                          placeholder="Description"
                        />
                        <textarea
                          className="rounded-md border border-neutral-300 p-2 text-sm md:col-span-2"
                          rows={2}
                          value={drafts[c.id].outcome.join("\n")}
                          onChange={(e) => updateDraft(c.id, { outcome: e.target.value.split("\n") })}
                          placeholder="Outcomes, one per line"
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-neutral-900">Lessons</h3>
                        <div className="mt-2 space-y-2">
                          {drafts[c.id].syllabus.map((lesson) => (
                            <div key={lesson.id} className="grid gap-2 rounded-md bg-white p-3 md:grid-cols-6 items-end">
                              <Input
                                className="md:col-span-2"
                                value={lesson.title}
                                onChange={(e) => updateLesson(c.id, lesson.id, { title: e.target.value })}
                                placeholder="Lesson title"
                              />
                              <Input
                                type="number"
                                value={lesson.order}
                                onChange={(e) => updateLesson(c.id, lesson.id, { order: Number(e.target.value) })}
                                placeholder="Order"
                              />
                              <Input
                                type="number"
                                value={lesson.duration_seconds}
                                onChange={(e) => updateLesson(c.id, lesson.id, { duration_seconds: Number(e.target.value) })}
                                placeholder="Duration sec"
                              />
                              <select
                                className="rounded-md border border-neutral-300 p-2 text-sm"
                                value={lesson.drive_file_id || ""}
                                onChange={(e) => updateLesson(c.id, lesson.id, { drive_file_id: e.target.value })}
                              >
                                <option value="">No Drive file</option>
                                {driveFiles.map((f) => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                              <Button variant="secondary" size="sm" onClick={() => removeLesson(c.id, lesson.id)}>Remove</Button>
                            </div>
                          ))}
                          {drafts[c.id].syllabus.length === 0 && <p className="text-sm text-neutral-600">No lessons yet.</p>}
                          <Button variant="secondary" size="sm" onClick={() => addLesson(c.id)}>Add lesson</Button>
                        </div>
                      </div>

                      <Button size="sm" onClick={() => saveCourse(c.id)}>Save changes</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
