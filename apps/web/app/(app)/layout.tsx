"use client";

import { AuthGuard } from "@/components/auth-guard";
import { TrialBanner } from "@/components/trial-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TrialBanner />
      {children}
    </AuthGuard>
  );
}
