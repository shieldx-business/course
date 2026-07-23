import { Suspense } from "react";
import { HeroSection } from "@/components/homepage/hero";
import { SearchBar } from "@/components/homepage/search-bar";
import { CategoryGrid } from "@/components/homepage/category-grid";
import { BenefitsSection } from "@/components/homepage/benefits";
import { ComparisonSection } from "@/components/homepage/comparison";
import { HowItWorksSection } from "@/components/homepage/how-it-works";
import { TestimonialsSection } from "@/components/homepage/testimonials";
import { FAQSection } from "@/components/homepage/faq";
import { FinalCTA } from "@/components/homepage/final-cta";
import { TrustBadges } from "@/components/homepage/trust-badges";
import { PartnerLogos } from "@/components/homepage/partner-logos";
import { VideoIntro } from "@/components/homepage/video-intro";
import { RepeatedCTA } from "@/components/homepage/repeated-cta";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonLd } from "@/components/json-ld";
import { makeMetadata, SITE_URL } from "@/lib/metadata";

export const metadata = makeMetadata();

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Ascendly",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/courses?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteSchema} />
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <HeroSection />
      </Suspense>
      <SearchBar />
      <PartnerLogos />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <TrustBadges />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-60 w-full" />}>
        <CategoryGrid />
      </Suspense>
      <BenefitsSection />
      <RepeatedCTA title="Start your free 3-day preview" buttonText="Get started" href="/verify-phone" variant="secondary" />
      <ComparisonSection />
      <HowItWorksSection />
      <VideoIntro />
      <Suspense fallback={<Skeleton className="h-60 w-full" />}>
        <TestimonialsSection />
      </Suspense>
      <RepeatedCTA title="Ready to unlock every course?" buttonText="See pricing" href="/pricing" />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
