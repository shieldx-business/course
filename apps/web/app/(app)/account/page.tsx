import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AccountPage() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Account</h1>
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600">Current plan</p>
              <p className="text-lg font-medium text-neutral-900">12-month membership</p>
              <p className="text-sm text-neutral-600">Renews on Aug 15, 2026</p>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </Card>
      </div>
    </section>
  );
}
