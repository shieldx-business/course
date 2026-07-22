"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AIAnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/admin/analytics/summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary({ error: "Analytics service unavailable" }));
  }, []);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-page px-6">
        <h1 className="text-3xl font-semibold text-primary-900">AI Analytics & Forecasting</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-medium text-neutral-900">LLM Summary</h2>
            <pre className="mt-3 overflow-auto rounded bg-neutral-100 p-3 text-xs text-neutral-900">
              {summary ? JSON.stringify(summary, null, 2) : "Loading..."}
            </pre>
          </Card>
          <Card className="p-5">
            <h2 className="font-medium text-neutral-900">LSTM Forecast</h2>
            <p className="mt-3 text-sm text-neutral-600">
              Run the forecasting pipeline to predict next 30-day revenue, churn risk, and content demand.
            </p>
            <Button className="mt-4">Run forecast</Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
