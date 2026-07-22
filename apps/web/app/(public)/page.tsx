import { HeroSection } from "@/components/homepage/hero";
import { SearchBar } from "@/components/homepage/search-bar";
import { CategoryGrid } from "@/components/homepage/category-grid";
import { BenefitsSection } from "@/components/homepage/benefits";
import { ComparisonSection } from "@/components/homepage/comparison";
import { HowItWorksSection } from "@/components/homepage/how-it-works";
import { TestimonialsSection } from "@/components/homepage/testimonials";
import { FAQSection } from "@/components/homepage/faq";
import { FinalCTA } from "@/components/homepage/final-cta";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SearchBar />
      <CategoryGrid />
      <BenefitsSection />
      <ComparisonSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
