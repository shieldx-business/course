"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { removeToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface Subscription {
  id: string;
  tier: string;
  status: string;
  starts_at: string;
  ends_at: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/subscriptions/me")
      .then(setSub)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    removeToken();
    router.push("/login");
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Account</h1>
        <Card className="mt-6 p-6">
          {loading ? (
            <p className="text-neutral-600">Loading...</p>
          ) : sub ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Current plan</p>
                <p className="text-lg font-medium text-neutral-900">{sub.tier} membership</p>
                <p className="text-sm text-neutral-600">Valid until {new Date(sub.ends_at).toLocaleDateString()}</p>
              </div>
              <Badge variant="success">{sub.status}</Badge>
            </div>
          ) : (
            <div>
              <p className="text-neutral-600">No active membership.</p>
              <a href="/pricing" className="mt-2 inline-block text-primary-700 hover:underline">View plans</a>
            </div>
          )}
        </Card>

        <Button variant="secondary" className="mt-6" onClick={logout}>Log out</Button>
      </div>
    </section>
  );
}
