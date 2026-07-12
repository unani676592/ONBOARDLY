import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Audience from "@/components/Audience";
import BuildInPublic from "@/components/BuildInPublic";
import Pricing from "@/components/Pricing";
import Faq from "@/components/Faq";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Audience />
        <BuildInPublic />
        <Pricing />
        <Faq />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
