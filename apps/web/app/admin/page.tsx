"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface DashboardData {
  total_members: number;
  active_subscriptions: number;
  total_courses: number;
  total_lessons: number;
  total_revenue: number;
  timestamp: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data
    ? [
        { label: "Total members", value: data.total_members.toLocaleString() },
        { label: "Active subscriptions", value: data.active_subscriptions.toLocaleString() },
        { label: "Total revenue", value: `$${data.total_revenue.toLocaleString()}` },
        { label: "Courses", value: `${data.total_courses} (${data.total_lessons} lessons)` },
      ]
    : [];

  return (
    <section className="py-12">
      <div>
        <h1 className="text-3xl font-semibold text-primary-900">Admin dashboard</h1>
        {loading ? (
          <p className="mt-6 text-neutral-600">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-5">
                <p className="text-sm text-neutral-600">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{s.value}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
