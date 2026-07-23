import { ShieldCheck, Lock, RefreshCcw, CreditCard } from "lucide-react";

const badges = [
  { icon: <ShieldCheck className="h-6 w-6" />, title: "7-day guarantee", body: "Money back, no questions asked." },
  { icon: <Lock className="h-6 w-6" />, title: "Secure payments", body: "Encrypted by Stripe & PayPal." },
  { icon: <RefreshCcw className="h-6 w-6" />, title: "Cancel anytime", body: "No hidden fees or surprise charges." },
  { icon: <CreditCard className="h-6 w-6" />, title: "No upsells", body: "One membership unlocks everything." },
];

export function TrustBadges() {
  return (
    <section className="border-y border-neutral-200 bg-white py-10 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-page px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <div className="text-accent-600">{b.icon}</div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{b.title}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
