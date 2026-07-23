"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

interface Tier {
  id: string;
  label: string;
  duration_months: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone_verified: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [override, setOverride] = useState({ tier_id: "", duration_months: "1" });

  useEffect(() => {
    Promise.all([apiFetch("/admin/users"), apiFetch("/subscriptions/tiers")])
      .then(([u, t]) => {
        setUsers(u);
        setTiers(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await apiFetch(`/admin/users/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editing.name, role: editing.role }),
      });
      const updated = await apiFetch("/admin/users");
      setUsers(updated);
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const grantSubscription = async (userId: string) => {
    setError("");
    try {
      await apiFetch(`/admin/users/${userId}/subscription`, {
        method: "POST",
        body: JSON.stringify({ tier_id: override.tier_id, duration_months: Number(override.duration_months) }),
      });
      alert("Subscription granted");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const cancelSubscription = async (userId: string) => {
    setError("");
    try {
      await apiFetch(`/admin/users/${userId}/subscription`, { method: "DELETE" });
      alert("Subscription canceled");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <section className="py-12">
      <div>
        <h1 className="text-3xl font-semibold text-primary-900">User management</h1>
        <Card className="mt-6 p-6">
          {loading ? <p className="text-neutral-600">Loading...</p> : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="pb-3 font-medium text-neutral-900">Email</th>
                  <th className="pb-3 font-medium text-neutral-900">Name</th>
                  <th className="pb-3 font-medium text-neutral-900">Role</th>
                  <th className="pb-3 font-medium text-neutral-900">Phone verified</th>
                  <th className="pb-3 font-medium text-neutral-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-100">
                    <td className="py-3 text-neutral-900">{u.email}</td>
                    <td className="py-3 text-neutral-600">{u.name}</td>
                    <td className="py-3 text-neutral-600">{u.role}</td>
                    <td className="py-3 text-neutral-600">{u.phone_verified ? "Yes" : "No"}</td>
                    <td className="py-3">
                      <Button size="sm" onClick={() => setEditing(u)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
        </Card>

        {editing && (
          <Card className="mt-6 p-6">
            <h2 className="font-medium text-neutral-900">Edit {editing.email}</h2>
            <form onSubmit={saveUser} className="mt-4 grid gap-4 md:grid-cols-3">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" />
              <Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="Role" />
              <Button type="submit">Save</Button>
            </form>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <select
                value={override.tier_id}
                onChange={(e) => setOverride({ ...override, tier_id: e.target.value })}
                className="rounded-md border border-neutral-300 p-2 text-sm"
              >
                <option value="">Select tier</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>{t.label} ({t.duration_months} mo)</option>
                ))}
              </select>
              <Input type="number" value={override.duration_months} onChange={(e) => setOverride({ ...override, duration_months: e.target.value })} placeholder="Months" />
              <Button onClick={() => grantSubscription(editing.id)}>Grant subscription</Button>
              <Button variant="secondary" onClick={() => cancelSubscription(editing.id)}>Cancel subscription</Button>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
