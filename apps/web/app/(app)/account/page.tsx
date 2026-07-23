"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
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
  const { user, logout, updateUser } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pwd, setPwd] = useState({ old: "", new: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch("/subscriptions/me")
      .then(setSub)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const updated = await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      updateUser(updated);
      setMessage("Profile updated.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (pwd.new !== pwd.confirm) {
      setPwdError("Passwords do not match");
      return;
    }
    try {
      await apiFetch("/auth/me/password", {
        method: "PUT",
        body: JSON.stringify({ old_password: pwd.old, new_password: pwd.new }),
      });
      setPwd({ old: "", new: "", confirm: "" });
      setMessage("Password updated.");
    } catch (e: any) {
      setPwdError(e.message);
    }
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

        <Card className="mt-6 p-6">
          <h2 className="font-semibold text-primary-900">Profile</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900">Email</label>
              <Input value={user?.email} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
            {message && <p className="text-sm text-success">{message}</p>}
          </form>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="font-semibold text-primary-900">Change password</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-4">
            <Input type="password" value={pwd.old} onChange={(e) => setPwd({ ...pwd, old: e.target.value })} placeholder="Current password" required />
            <Input type="password" value={pwd.new} onChange={(e) => setPwd({ ...pwd, new: e.target.value })} placeholder="New password" required />
            <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="Confirm new password" required />
            <Button type="submit">Update password</Button>
            {pwdError && <p className="text-sm text-error">{pwdError}</p>}
          </form>
        </Card>

        <Button variant="secondary" className="mt-6" onClick={handleLogout}>Log out</Button>
      </div>
    </section>
  );
}
