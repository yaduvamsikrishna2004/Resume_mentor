import { lazy, Suspense } from "react";

const HeroSection = lazy(() => import("../components/landing/HeroSection"));
const LiveDemoSection = lazy(() => import("../components/landing/LiveDemoSection"));
const AICapabilitiesSection = lazy(() => import("../components/landing/AICapabilitiesSection"));
const BeforeAfterSection = lazy(() => import("../components/landing/BeforeAfterSection"));
const ChatPreviewSection = lazy(() => import("../components/landing/ChatPreviewSection"));
const TrustedBySection = lazy(() => import("../components/landing/TrustedBySection"));
const StickyCTASection = lazy(() => import("../components/landing/StickyCTASection"));
const LandingFooter = lazy(() => import("../components/landing/LandingFooter"));

function SectionFallback() {
  return <div className="skeleton h-40 rounded-3xl" />;
}

function HomePage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<SectionFallback />}>
        <HeroSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TrustedBySection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <LiveDemoSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <AICapabilitiesSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <BeforeAfterSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <ChatPreviewSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <StickyCTASection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <LandingFooter />
      </Suspense>
    </div>
  );
}

export default HomePage;
