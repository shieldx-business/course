"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

function hoursUntil(iso: string): number | null {
  const end = new Date(iso).getTime();
  const remaining = end - Date.now();
  if (Number.isNaN(end) || remaining <= 0) return 0;
  return Math.ceil(remaining / (1000 * 60 * 60));
}

export function TrialBanner() {
  const { user } = useAuth();
  const trialActive = !!user?.trial_active && user?.trial_expires;
  const hours = trialActive && user?.trial_expires ? hoursUntil(user.trial_expires) : null;

  if (hours === null || hours > 48 || user?.subscription_status === "active") {
    return null;
  }

  return (
    <div className="bg-warning/15 px-4 py-2 text-center text-sm font-medium text-warning">
      {hours === 0 ? (
        <>Your free preview ends soon. <Link href="/pricing" className="underline">Subscribe now</Link> to keep learning.</>
      ) : (
        <>Your free preview ends in {hours} hours. <Link href="/pricing" className="underline">Subscribe now</Link> to keep learning without limits.</>
      )}
    </div>
  );
}
