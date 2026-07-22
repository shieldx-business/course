const posts: Record<string, { title: string; content: string }> = {
  "learn-excel-promotion": {
    title: "How to learn Excel for a promotion",
    content: "Most Excel tutorials cover features you'll never use. Start with the five skills that actually show up in promotion conversations: lookup formulas, pivot tables, conditional formatting, charts that tell a story, and forecasting with simple regression.",
  },
  "power-bi-without-degree": {
    title: "Learn Power BI without going back to school",
    content: "Power BI looks intimidating because most courses teach the tool instead of the job. Start with your business question, learn to model a simple star schema, and build one report a week until you can answer questions faster than your manager can ask them.",
  },
  "career-change-ux": {
    title: "Career change: from receptionist to junior UX designer",
    content: "A portfolio beats a certificate. Pick one real problem you care about, research five users, design a solution, and test it. Repeat three times. That's enough work to prove you can do the job.",
  },
};

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  if (!post) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-2xl font-semibold">Post not found</h1>
      </section>
    );
  }
  return (
    <article className="py-16">
      <div className="mx-auto max-w-page px-6 max-w-3xl">
        <h1 className="text-3xl font-semibold text-primary-900">{post.title}</h1>
        <p className="mt-6 text-neutral-600 leading-relaxed">{post.content}</p>
      </div>
    </article>
  );
}
