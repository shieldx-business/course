import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-semibold text-primary-900">404</h1>
      <p className="mt-2 text-neutral-600">This page doesn&apos;t exist.</p>
      <Link href="/" className="mt-6">
        <Button>Back to homepage</Button>
      </Link>
    </section>
  );
}
