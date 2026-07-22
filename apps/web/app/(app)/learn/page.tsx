import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LearnDashboard() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Learning dashboard</h1>
        <Card className="mt-6 p-6">
          <p className="text-sm text-neutral-600">Pick up where you left off:</p>
          <h2 className="mt-1 text-xl font-medium text-neutral-900">Excel for Busy Professionals</h2>
          <p className="text-sm text-neutral-600">Lesson 4 of 12</p>
          <Link href="/learn/excel-for-busy-professionals/lesson-4">
            <Button className="mt-4">Continue learning</Button>
          </Link>
        </Card>

        <h2 className="mt-10 text-xl font-semibold text-primary-900">Recommended for you</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {["Power BI Fundamentals", "Leadership for New Managers", "ChatGPT for Work"].map((c) => (
            <Card key={c} className="p-5">
              <p className="font-medium text-neutral-900">{c}</p>
              <Link href="/learn/excel-for-busy-professionals/lesson-1">
                <Button variant="secondary" className="mt-3 w-full">Start</Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
