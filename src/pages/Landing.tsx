import { HeroSection } from '@/components/blocks/hero-section-9';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { Footer } from '@/components/ui/footer-section';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </div>
  );
}
