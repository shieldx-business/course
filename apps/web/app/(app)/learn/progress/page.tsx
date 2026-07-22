import { Card } from "@/components/ui/card";

export default function ProgressPage() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Your progress</h1>
        <Card className="mt-6 p-6">
          <p className="text-neutral-900">Completed lessons: 23</p>
          <p className="text-neutral-600">Courses in progress: 3</p>
          <div className="mt-4 h-2 w-full rounded-full bg-neutral-100">
            <div className="h-2 rounded-full bg-accent-500" style={{ width: "34%" }} />
          </div>
          <p className="mt-2 text-sm text-neutral-600">34% of your current learning goal</p>
        </Card>
      </div>
    </section>
  );
}
