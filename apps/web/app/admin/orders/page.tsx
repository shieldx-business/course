import { Card } from "@/components/ui/card";

export default function AdminOrders() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Orders & payments</h1>
        <Card className="mt-6 p-6">
          <p className="text-neutral-600">Transaction log, refunds, and revenue overview.</p>
        </Card>
      </div>
    </section>
  );
}
