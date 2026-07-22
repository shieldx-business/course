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
    <section className="py-16">
      <div className="mx-auto max-w-page px-6">
        <h2 className="text-2xl font-semibold text-primary-900">Questions before you subscribe?</h2>
        <dl className="mt-8 space-y-4">
          {items.map((item) => (
            <div key={item.q} className="rounded-lg border border-neutral-300 p-6">
              <dt className="font-medium text-neutral-900">{item.q}</dt>
              <dd className="mt-2 text-sm text-neutral-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
