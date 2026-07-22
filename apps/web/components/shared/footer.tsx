import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-page px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
          <div>
            <p className="text-lg font-semibold text-white">Ascendly</p>
            <p className="mt-2 max-w-xs text-sm">
              One membership. Every skill you&apos;ll ever need.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
            {footerLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-12 border-t border-neutral-700 pt-6 text-xs text-neutral-600">
          © {new Date().getFullYear()} Ascendly. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
