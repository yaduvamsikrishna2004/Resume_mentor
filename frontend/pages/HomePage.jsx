import ATSPreviewSection from "../components/landing/ATSPreviewSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import HeroSection from "../components/landing/HeroSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import LandingFooter from "../components/landing/LandingFooter";
import TestimonialsSection from "../components/landing/TestimonialsSection";

function HomePage() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ATSPreviewSection />
      <TestimonialsSection />
      <LandingFooter />
    </div>
  );
}

export default HomePage;
