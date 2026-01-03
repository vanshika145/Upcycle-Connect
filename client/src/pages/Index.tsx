import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ImpactPreview } from "@/components/ImpactPreview";
import { MapPreview } from "@/components/MapPreview";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <ImpactPreview />
      <MapPreview />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
