"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  role: string;
  phone_verified: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/admin/users")
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
                  <th className="pb-3 font-medium text-neutral-900">Role</th>
                  <th className="pb-3 font-medium text-neutral-900">Phone verified</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-neutral-100">
                    <td className="py-3 text-neutral-900">{u.email}</td>
                    <td className="py-3 text-neutral-600">{u.role}</td>
                    <td className="py-3 text-neutral-600">{u.phone_verified ? "Yes" : "No"}</td>
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
