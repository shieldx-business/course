import { Card } from "@/components/ui/card";

const stats = [
  { label: "Total members", value: "12,450" },
  { label: "Active subscriptions", value: "9,820" },
  { label: "MRR", value: "$142,300" },
  { label: "Courses", value: "2,014" },
];

export default function AdminDashboard() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Admin dashboard</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <p className="text-sm text-neutral-600">{s.label}</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{s.value}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
