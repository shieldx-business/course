"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface Order {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_provider: string;
  payment_status: string;
  coupon_code: string | null;
  created_at: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/admin/orders")
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Orders</h1>
        <Card className="mt-6 p-6">
          {loading ? <p className="text-neutral-600">Loading...</p> : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="pb-3 font-medium text-neutral-900">ID</th>
                  <th className="pb-3 font-medium text-neutral-900">User</th>
                  <th className="pb-3 font-medium text-neutral-900">Amount</th>
                  <th className="pb-3 font-medium text-neutral-900">Provider</th>
                  <th className="pb-3 font-medium text-neutral-900">Status</th>
                  <th className="pb-3 font-medium text-neutral-900">Coupon</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-100">
                    <td className="py-3 text-neutral-900">{o.id.slice(0, 20)}...</td>
                    <td className="py-3 text-neutral-600">{o.user_id}</td>
                    <td className="py-3 text-neutral-600">${o.amount}</td>
                    <td className="py-3 text-neutral-600">{o.payment_provider}</td>
                    <td className="py-3 text-neutral-600">{o.payment_status}</td>
                    <td className="py-3 text-neutral-600">{o.coupon_code || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
        </Card>
      </div>
    </section>
  );
}
