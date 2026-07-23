"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface Lesson {
  id: string;
  title: string;
  drive_file_id?: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  category_name: string;
  lesson_count: number;
  syllabus: Lesson[];
}

interface DriveFile {
  id: string;
  name: string;
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category_id: "", title: "", slug: "", description: "" });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiFetch("/admin/courses"), apiFetch("/admin/drive/files")])
      .then(([c, d]) => {
        setCourses(c);
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

  const mapDrive = async (courseId: string, lessonId: string, driveFileId: string) => {
    setError("");
    try {
      await apiFetch(`/admin/courses/${courseId}/lessons/${lessonId}/drive`, {
        method: "PUT",
        body: JSON.stringify({ drive_file_id: driveFileId }),
      });
      const updated = await apiFetch("/admin/courses");
      setCourses(updated);
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
          {loading ? <p className="mt-3 text-sm text-neutral-600">Loading...</p> : (
            <ul className="mt-3 space-y-3">
              {courses.map((c) => (
                <li key={c.id} className="border-b border-neutral-100 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{c.title}</p>
                      <p className="text-xs text-neutral-600">{c.category_name} · {c.lesson_count} lessons</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                        {expanded === c.id ? "Hide lessons" : "Manage videos"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => remove(c.id)}>Delete</Button>
                    </div>
                  </div>
                  {expanded === c.id && (
                    <div className="mt-3 space-y-2">
                      {c.syllabus.map((lesson) => (
                        <div key={lesson.id} className="grid gap-2 rounded-md bg-neutral-50 p-3 md:grid-cols-3">
                          <p className="text-sm text-neutral-900">{lesson.title}</p>
                          <p className="text-xs text-neutral-600">{lesson.drive_file_id ? `Drive: ${lesson.drive_file_id}` : "No Drive file mapped"}</p>
                          <select
                            value={lesson.drive_file_id || ""}
                            onChange={(e) => mapDrive(c.id, lesson.id, e.target.value)}
                            className="rounded-md border border-neutral-300 p-2 text-sm"
                          >
                            <option value="">Select Drive file</option>
                            {driveFiles.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {c.syllabus.length === 0 && <p className="text-sm text-neutral-600">No lessons yet.</p>}
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
