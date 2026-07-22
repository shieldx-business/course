import { Card } from "@/components/ui/card";

export default function AdminUsers() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">User management</h1>
        <Card className="mt-6 p-6">
          <p className="text-neutral-600">Search users, view plans, and manage access.</p>
        </Card>
      </div>
    </section>
  );
}
