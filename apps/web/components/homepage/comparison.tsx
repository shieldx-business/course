import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

export function ComparisonSection() {
  return (
    <section className="bg-neutral-100 py-16">
      <div className="mx-auto max-w-page px-6">
        <h2 className="text-2xl font-semibold text-primary-900">Do the math once.</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-medium text-neutral-900">Buying courses one by one</h3>
            <div className="mt-4 space-y-3 text-sm text-neutral-600">
              <p className="flex items-center gap-2"><X className="h-4 w-4 text-error" /> Average course elsewhere: $50–200</p>
              <p className="flex items-center gap-2"><X className="h-4 w-4 text-error" /> Ten courses: $500–2,000</p>
              <p className="flex items-center gap-2"><X className="h-4 w-4 text-error" /> Easy to abandon between platforms</p>
            </div>
          </Card>
          <Card className="border-2 border-accent-500 p-6">
            <h3 className="font-medium text-neutral-900">One Ascendly membership</h3>
            <div className="mt-4 space-y-3 text-sm text-neutral-900">
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Every course, starting at $29/month</p>
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Same instructors, structured paths</p>
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Cancel anytime</p>
            </div>
          </Card>
        </div>
        <p className="mt-6 text-sm text-neutral-600">You&apos;d need to finish less than one course to break even.</p>
      </div>
    </section>
  );
}
