"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export function VerifyPhoneForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/learn";
  const { login } = useAuth();

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      if (res.access_token && res.user) {
        login(res.access_token, res.user);
      }
      router.push(next);
    } catch (e: any) {
      setError(e.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-primary-900">Verify your phone</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Verify your phone number to unlock a 3-day, 10% preview of any course.
        </p>
        {error && <p className="mt-4 text-sm text-error">{error}</p>}
        {!sent ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <Input
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <Input
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify and start preview"}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
