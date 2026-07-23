"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/theme-provider";

const links = [
  { href: "/courses", label: "Courses" },
  { href: "/membership", label: "Membership" },
  { href: "/pricing", label: "Pricing" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-primary-700 text-white">
      <nav className="mx-auto flex max-w-page items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Ascendly
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-sm text-neutral-100 hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggle}
            className="rounded-md p-2 hover:bg-white/10"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <>
              <Link href="/account">
                <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                  Account
                </Button>
              </Link>
              {user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                    Admin
                  </Button>
                </Link>
              )}
              <Button variant="primary" className="bg-accent-500 text-white hover:bg-accent-600" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                  Log in
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="primary" className="bg-accent-500 text-white hover:bg-accent-600">
                  Start learning
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 px-6 pb-4 md:hidden">
          <ul className="flex flex-col gap-4 pt-4">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
            <li>
              <button onClick={toggle} className="flex items-center gap-2">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </li>
            {user ? (
              <>
                <li><Link href="/account">Account</Link></li>
                {user.role === "admin" && <li><Link href="/admin">Admin</Link></li>}
                <li><button onClick={logout}>Log out</button></li>
              </>
            ) : (
              <>
                <li><Link href="/login">Log in</Link></li>
                <li><Link href="/pricing" className="text-accent-500">Start learning</Link></li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
