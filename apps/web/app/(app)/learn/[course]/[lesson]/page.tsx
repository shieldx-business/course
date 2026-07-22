import { Card } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";

const lessons = [
  { id: "lesson-1", title: "Course introduction", completed: true, locked: false },
  { id: "lesson-2", title: "Setting up your workspace", completed: true, locked: false },
  { id: "lesson-3", title: "Core formulas", completed: true, locked: false },
  { id: "lesson-4", title: "Pivot tables", completed: false, locked: false },
  { id: "lesson-5", title: "Charts and dashboards", completed: false, locked: true },
];

export default function CoursePlayerPage({ params }: { params: { course: string; lesson: string } }) {
  const current = lessons.find((l) => l.id === params.lesson) || lessons[0];

  return (
    <section className="py-6">
      <div className="mx-auto max-w-page px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="aspect-video rounded-lg bg-neutral-900 flex items-center justify-center text-white">
              <p className="text-center text-neutral-300">Video player: {current.title}</p>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-primary-900">{current.title}</h1>
          </div>
          <Card className="h-fit p-5">
            <h2 className="font-semibold text-primary-900">Lessons</h2>
            <ul className="mt-4 space-y-3">
              {lessons.map((l) => (
                <li key={l.id} className="flex items-center justify-between text-sm">
                  <span className={l.id === params.lesson ? "font-medium text-accent-600" : "text-neutral-900"}>
                    {l.title}
                  </span>
                  {l.completed ? <Check className="h-4 w-4 text-success" /> : l.locked ? <Lock className="h-4 w-4 text-neutral-300" /> : null}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
