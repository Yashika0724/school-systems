import { HeroSection } from '@/components/landing/HeroSection';
import { LoginCards } from '@/components/landing/LoginCards';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { Footer } from '@/components/landing/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <LoginCards />
      <FeaturesSection />
      <Footer />
    </div>
  );
}
