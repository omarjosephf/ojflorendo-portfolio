import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { HomeServices } from "@/components/home/HomeServices";
import { Work } from "@/components/home/Work";
import { AskEv } from "@/components/home/AskEv";
import { WhyIBuild } from "@/components/home/WhyIBuild";
import { Contact } from "@/components/sections/Contact";
import { StarSkyLazy } from "@/components/stars/StarSkyLazy";

/**
 * The home page answers a visitor's questions in order: who is this and what
 * does he do, how would it work, what exactly is on offer, can I see it working,
 * can I ask about it, why does he do it, and how do I start. Background, the
 * journey and credentials live on /about. The star sky behind it is decoration
 * only (ADR-0030): the page is complete and readable without it.
 */
export default function Home() {
  return (
    <>
      <StarSkyLazy />
      <HomeHero />
      <HowItWorks />
      <HomeServices />
      <Work />
      <AskEv />
      <WhyIBuild />
      <Contact />
    </>
  );
}
