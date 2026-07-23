"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(data.access_token, data.user);
      router.push("/learn");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogle = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) return;
    try {
      const data = await apiFetch("/auth/google", {
        method: "POST",
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      login(data.access_token, data.user);
      router.push("/learn");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <section className="flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-primary-900">Log in</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full">Log in</Button>
        </form>

        {googleClientId && (
          <>
            <div className="my-4 text-center text-sm text-neutral-600">or</div>
            <div className="flex justify-center">
              <GoogleLogin onSuccess={handleGoogle} onError={() => setError("Google sign-in failed")} text="signin_with" />
            </div>
          </>
        )}

        <p className="mt-4 text-center text-sm text-neutral-600">
          <Link href="/forgot-password" className="text-primary-700 hover:underline">Forgot password?</Link>
        </p>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Don&apos;t have an account? <Link href="/signup" className="text-primary-700 hover:underline">Sign up</Link>
        </p>
      </Card>
    </section>
  );
}
