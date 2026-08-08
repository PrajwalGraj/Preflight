import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ScrollProgress } from "../components/ScrollProgress";
import { Hero } from "./sections/Hero";
import { StatsBanner } from "./sections/StatsBanner";
import { PreflightSignal } from "./sections/PreflightSignal";
import { PopularActions } from "./sections/PopularActions";
import { CheckProgram } from "./sections/CheckProgram";
import { HowItWorks } from "./sections/HowItWorks";
import { WhyPreflight } from "./sections/WhyPreflight";
import { DeveloperSection } from "./sections/DeveloperSection";
import { ArchitectureDiagram } from "./sections/ArchitectureDiagram";

export function Home() {
  return (
    <div className="min-h-screen bg-black">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <StatsBanner />
        <PreflightSignal />
        <PopularActions />
        <CheckProgram />
        <HowItWorks />

        {/* Soft blend into the full-bleed yellow section instead of a hard cut */}
        <div className="fade-black-to-yellow" aria-hidden />
        <WhyPreflight />
        <div className="fade-yellow-to-black" aria-hidden />

        <DeveloperSection />
        <ArchitectureDiagram />
      </main>
      <Footer />
    </div>
  );
}
