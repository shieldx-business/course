import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Subscription, Order } from "@/types";

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/subscriptions/me");
      setSubscription(data);
      setError(null);
    } catch (e: any) {
      setSubscription(null);
      setError(e.message ?? "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { subscription, loading, error, refresh };
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/subscriptions/orders")
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { orders, loading };
}

export function useCreateCheckout() {
  const [loading, setLoading] = useState(false);

  const createCheckout = useCallback(
    async (tierId: string, provider: "stripe" | "paypal" = "stripe", couponCode?: string) => {
      setLoading(true);
      try {
        const data = await apiFetch("/checkout/session", {
          method: "POST",
          body: JSON.stringify({ tier_id: tierId, payment_provider: provider, coupon_code: couponCode }),
        });
        return data;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createCheckout, loading };
}
