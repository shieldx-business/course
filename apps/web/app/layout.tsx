import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Ascendly — One Membership, 2,000+ Online Courses",
  description:
    "Learn business, tech, design, and data skills with one membership. 2,000+ expert-led courses. Start your free preview today.",
  openGraph: {
    title: "Ascendly — One Membership, 2,000+ Online Courses",
    description:
      "Learn business, tech, design, and data skills with one membership. 2,000+ expert-led courses.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased min-h-screen flex flex-col bg-neutral-0 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <Providers>
          <ThemeProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
