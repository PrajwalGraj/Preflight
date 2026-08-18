import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ScrollProgress } from "../components/ScrollProgress";
import { Hero } from "./sections/Hero";
import { TransactionFlow } from "./sections/TransactionFlow";
import { StatsBanner } from "./sections/StatsBanner";
import { PreflightSignal } from "./sections/PreflightSignal";
import { PopularActions } from "./sections/PopularActions";
import { CheckProgram } from "./sections/CheckProgram";
import { HowItWorks } from "./sections/HowItWorks";
import { WhyPreflight } from "./sections/WhyPreflight";
import { DeveloperSection } from "./sections/DeveloperSection";
import { ArchitectureDiagram } from "./sections/ArchitectureDiagram";
import { NetworkPulse } from "./sections/NetworkPulse";
import { AskPreflight } from "../components/AskPreflight";

export function Home() {
  return (
    <div className="min-h-screen bg-black">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <TransactionFlow />
        <StatsBanner />
        <PreflightSignal />
        <AskPreflight />
        <PopularActions />
        <CheckProgram />
        <HowItWorks />

        {/* Hard accent rule marks the chapter break into the inverted section */}
        <div className="rule-accent" aria-hidden />
        <WhyPreflight />
        <div className="rule-accent" aria-hidden />

        <DeveloperSection />
        <ArchitectureDiagram />
        <NetworkPulse />
      </main>
      <Footer />
    </div>
  );
}
