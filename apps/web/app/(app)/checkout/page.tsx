"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function CheckoutPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const apply = async () => {
    setError("");
    const res = await fetch(`/api/v1/subscriptions/coupons/${code}`);
    if (!res.ok) setError("That code isn't valid or has expired.");
    else setSuccess(true);
  };

  const pay = async () => {
    setSuccess(false);
    alert("This is a demo checkout. Stripe/PayPal integration is configured server-side.");
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6 max-w-2xl">
        <h1 className="text-3xl font-semibold text-primary-900">Checkout</h1>
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between border-b border-neutral-300 pb-4">
            <p className="text-neutral-900">12-month membership</p>
            <p className="font-semibold text-neutral-900">$348</p>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-900">Have a code?</p>
            <div className="mt-2 flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" />
              <Button variant="secondary" onClick={apply}>
                Apply
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-error">{error}</p>}
            {success && <p className="mt-2 text-sm text-success">Coupon applied.</p>}
          </div>
          <div className="mt-6 flex items-center justify-between text-lg font-semibold text-neutral-900">
            <p>Total due today</p>
            <p>$348</p>
          </div>
          <Button onClick={pay} className="mt-6 w-full">
            Subscribe now
          </Button>
          <p className="mt-3 text-center text-xs text-neutral-600">
            Secure checkout via Stripe or PayPal
          </p>
        </Card>
      </div>
    </section>
  );
}
