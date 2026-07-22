import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionTier } from "@/types";
import { Check, Shield } from "lucide-react";
import Link from "next/link";

export default async function PricingPage() {
  let tiers: SubscriptionTier[] = [];
  try {
    const res = await fetch(
      `${process.env.API_BASE_URL || "http://localhost:8000"}/api/v1/subscriptions/tiers`,
      { next: { revalidate: 60 } }
    );
    if (res.ok) tiers = await res.json();
  } catch {
    tiers = [];
  }

  const total = (t: SubscriptionTier) => {
    const full = t.price_per_month * t.duration_months;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(full);
  };

  return (
    <section className="py-16">
      <div className="mx-auto max-w-page px-6 text-center">
        <h1 className="text-3xl font-semibold text-primary-900">Simple pricing. No per-course surprises.</h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          Every plan includes the full library — 2,000+ courses, no exceptions, no upsells.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              highlighted={tier.recommended}
              className={`flex flex-col p-6 text-left ${tier.recommended ? "relative" : ""}`}
            >
              {tier.recommended && (
                <Badge variant="accent" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Best value
                </Badge>
              )}
              {tier.badge && !tier.recommended && (
                <Badge variant="warning" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {tier.badge}
                </Badge>
              )}
              <p className="text-sm text-neutral-600">{tier.label}</p>
              <p className="mt-2 text-3xl font-semibold text-neutral-900">
                ${tier.price_per_month}
                <span className="text-base font-normal text-neutral-600">/mo</span>
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {tier.duration_months >= 999 ? "One-time" : `${total(tier)} total`}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-900">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Full library access</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Cancel anytime</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 7-day guarantee</li>
              </ul>
              <Link href="/checkout" className="mt-6">
                <Button variant={tier.recommended ? "primary" : "secondary"} className="w-full">
                  Subscribe
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-4 text-sm text-neutral-600">
          <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> 7-day money-back guarantee</span>
          <span>Cancel anytime</span>
          <span>Secure checkout via Stripe and PayPal</span>
        </div>
      </div>
    </section>
  );
}
