import { Card } from "@/components/ui/card";

const invoices = [
  { id: "INV-001", date: "2025-08-15", amount: "$348" },
  { id: "INV-002", date: "2024-08-15", amount: "$348" },
];

export default function BillingPage() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Billing history</h1>
        <Card className="mt-6 p-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="pb-3 font-medium text-neutral-900">Invoice</th>
                <th className="pb-3 font-medium text-neutral-900">Date</th>
                <th className="pb-3 font-medium text-neutral-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-neutral-100">
                  <td className="py-3 text-neutral-900">{i.id}</td>
                  <td className="py-3 text-neutral-600">{i.date}</td>
                  <td className="py-3 text-neutral-900">{i.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}
