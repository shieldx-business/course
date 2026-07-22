"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function VerifyPhonePage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/v1/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
    setSent(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/v1/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });
    if (res.ok) router.push("/learn");
  };

  return (
    <section className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-primary-900">Verify your phone</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Verify your phone number to unlock a 3-day, 10% preview of any course.
        </p>
        {!sent ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <Input placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <Button type="submit" className="w-full">Send code</Button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <Input placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} required />
            <Button type="submit" className="w-full">Verify and start preview</Button>
          </form>
        )}
      </Card>
    </section>
  );
}
