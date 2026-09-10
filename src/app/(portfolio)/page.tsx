import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Projects } from "@/components/sections/Projects";
import { HowIWork } from "@/components/sections/HowIWork";
import { Contact } from "@/components/sections/Contact";

/**
 * The landing page answers one visitor's questions, in order: what do you do,
 * can you show me, how would this run, how do I start.
 *
 * Everything that is background about OJ rather than about the offer now lives
 * on `/about`. Nothing was deleted in the move — About, Now, Skills, Experience
 * and Education are all retained in full on that route, linked from the primary
 * navigation and the footer. "How I work" stays here because it is part of the
 * decision a prospective client makes before enquiring, not background.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Projects />
      <HowIWork />
      <Contact />
    </>
  );
}
