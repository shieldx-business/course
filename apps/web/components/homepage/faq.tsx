export function FAQSection() {
  const items = [
    {
      q: "What happens after I subscribe?",
      a: "You get immediate, unlimited access to every course in the library for the duration of your plan.",
    },
    {
      q: "Can I cancel?",
      a: "Yes. You can cancel anytime under 12-month plans and keep access until the end of your billing period.",
    },
    {
      q: "Is there a refund policy?",
      a: "We offer a 7-day money-back guarantee, no questions asked, one time per account.",
    },
  ];

  return (
    <section className="py-16 dark:bg-neutral-900">
      <div className="mx-auto max-w-page px-6">
        <h2 className="text-2xl font-semibold text-primary-900 dark:text-white">Questions before you subscribe?</h2>
        <dl className="mt-8 space-y-4">
          {items.map((item) => (
            <div key={item.q} className="rounded-lg border border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <dt className="font-medium text-neutral-900 dark:text-neutral-100">{item.q}</dt>
              <dd className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
