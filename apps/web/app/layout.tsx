import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { JsonLd } from "@/components/json-ld";
import { makeMetadata, SITE_URL } from "@/lib/metadata";

export const metadata: Metadata = makeMetadata();

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ascendly",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [
    "https://twitter.com/ascendly",
    "https://linkedin.com/company/ascendly",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <JsonLd data={organizationSchema} />
      </head>
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
