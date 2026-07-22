import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  "Unlimited access to 2,000+ courses",
  "New courses added monthly",
  "Structured learning paths",
  "Progress tracking across devices",
  "Offline viewing (mobile app coming soon)",
  "Member-only community",
];

export default function MembershipPage() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Membership</h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Ascendly is built for people with a job, not people with free time. One membership replaces
          scattered tutorials with a structured, premium library.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f} className="flex items-start gap-3 p-5">
              <Check className="h-5 w-5 shrink-0 text-success" />
              <p className="text-neutral-900">{f}</p>
            </Card>
          ))}
        </div>
        <Link href="/pricing" className="mt-10 inline-block">
          <Button size="lg">See pricing</Button>
        </Link>
      </div>
    </section>
  );
}
