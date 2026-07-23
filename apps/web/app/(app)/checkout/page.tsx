"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";

interface Tier {
  id: string;
  label: string;
  price_per_month: number;
  duration_months: number;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-neutral-600">Loading...</p>}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tierId = searchParams.get("tier") || "tier-1mo";
  const paypalOrderId = searchParams.get("paypal_order_id");
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const [tier, setTier] = useState<Tier | null>(null);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ discount_value: number } | null>(null);
  const [provider, setProvider] = useState<"stripe" | "paypal">((searchParams.get("provider") as "stripe" | "paypal") || "stripe");
  const [paypalOrder, setPaypalOrder] = useState<{ order_id: string; approval_url: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/subscriptions/tiers")
      .then((tiers: Tier[]) => setTier(tiers.find((t) => t.id === tierId) || tiers[0]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tierId]);

  useEffect(() => {
    if (success && provider === "paypal") {
      const orderId = paypalOrderId || sessionStorage.getItem("paypal_order_id");
      if (orderId) {
        setLoading(true);
        apiFetch(`/checkout/paypal/capture?order_id=${orderId}`, { method: "POST" })
          .then(() => {
            sessionStorage.removeItem("paypal_order_id");
            router.push("/learn");
          })
          .catch((e) => setError(e.message))
          .finally(() => setLoading(false));
        return;
      }
    }
    if (success) {
      const t = setTimeout(() => router.push("/learn"), 2000);
      return () => clearTimeout(t);
    }
  }, [success, paypalOrderId, provider, router]);

  const apply = async () => {
    setError("");
    try {
      const c = await apiFetch(`/subscriptions/coupons/${code}`);
      setCoupon(c);
    } catch (e: any) {
      setCoupon(null);
      setError("That code isn't valid or has expired.");
    }
  };

  const total = (() => {
    if (!tier) return 0;
    const base = tier.duration_months >= 999 ? 999 : tier.price_per_month * tier.duration_months;
    if (coupon) return Math.round(base * (1 - coupon.discount_value / 100));
    return base;
  })();

  const pay = async () => {
    setError("");
    setPaypalOrder(null);
    try {
      const data = await apiFetch("/checkout/session", {
        method: "POST",
        body: JSON.stringify({ tier_id: tier?.id, coupon_code: code || null, payment_provider: provider }),
      });
      if (data.provider === "paypal" && data.order?.approval_url) {
        sessionStorage.setItem("paypal_order_id", data.order.order_id);
        window.location.href = data.order.approval_url;
        return;
      }
      if (data.session_url) {
        window.location.href = data.session_url;
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (success && !paypalOrderId) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-primary-900">Payment successful</h1>
        <p className="mt-2 text-neutral-600">Redirecting you to your learning dashboard...</p>
      </section>
    );
  }

  if (canceled) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-2xl font-semibold text-primary-900">Checkout canceled</h1>
        <p className="mt-2 text-neutral-600">Your payment was not completed. You can try again.</p>
      </section>
    );
  }

  if (loading) return <p className="py-20 text-center text-neutral-600">Loading...</p>;
  if (!tier) return <p className="py-20 text-center text-error">Tier not found</p>;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page max-w-2xl px-6">
        <h1 className="text-3xl font-semibold text-primary-900">Checkout</h1>
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between border-b border-neutral-300 pb-4">
            <p className="text-neutral-900">{tier.label}</p>
            <p className="font-semibold text-neutral-900">${tier.duration_months >= 999 ? 999 : tier.price_per_month * tier.duration_months}</p>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-900">Have a code?</p>
            <div className="mt-2 flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" />
              <Button variant="secondary" onClick={apply}>Apply</Button>
            </div>
            {coupon && <p className="mt-2 text-sm text-success">{coupon.discount_value}% off applied.</p>}
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-neutral-900">Pay with</p>
            <div className="mt-2 flex gap-2">
              <Button variant={provider === "stripe" ? "primary" : "secondary"} onClick={() => setProvider("stripe")}>Stripe</Button>
              <Button variant={provider === "paypal" ? "primary" : "secondary"} onClick={() => setProvider("paypal")}>PayPal</Button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-lg font-semibold text-neutral-900">
            <p>Total due today</p>
            <p>${total}</p>
          </div>

          {paypalOrder ? (
            <a href={paypalOrder.approval_url}>
              <Button className="mt-6 w-full">Continue to PayPal</Button>
            </a>
          ) : (
            <Button onClick={pay} className="mt-6 w-full">Subscribe now</Button>
          )}

          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <p className="mt-3 text-center text-xs text-neutral-600">Secure checkout via Stripe or PayPal</p>
        </Card>
      </div>
    </section>
  );
}
