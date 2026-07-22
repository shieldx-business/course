import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ContactPage() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-page px-6 max-w-xl">
        <h1 className="text-3xl font-semibold text-primary-900">Contact us</h1>
        <p className="mt-2 text-neutral-600">Questions about Ascendly? Send us a message and we&apos;ll reply within one business day.</p>
        <Card className="mt-8 p-6">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900">Name</label>
              <Input placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900">Message</label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-sm border border-neutral-300 p-3 text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                placeholder="How can we help?"
              />
            </div>
            <Button className="w-full">Send message</Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
