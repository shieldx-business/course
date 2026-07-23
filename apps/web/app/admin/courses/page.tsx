"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface Course {
  id: string;
  title: string;
  slug: string;
  category_name: string;
  lesson_count: number;
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category_id: "", title: "", slug: "", description: "" });

  useEffect(() => {
    apiFetch("/admin/courses")
      .then(setCourses)
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

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
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
                <li key={c.id} className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <div>
                    <p className="font-medium text-neutral-900">{c.title}</p>
                    <p className="text-xs text-neutral-600">{c.category_name} · {c.lesson_count} lessons</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => remove(c.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
