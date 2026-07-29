import { Hero } from "@/components/sections/Hero";
import { Mission } from "@/components/sections/Mission";
import { About } from "@/components/sections/About";
import { HowIWork } from "@/components/sections/HowIWork";
import { Now } from "@/components/sections/Now";
import { Skills } from "@/components/sections/Skills";
import { Services } from "@/components/sections/Services";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Education } from "@/components/sections/Education";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Mission />
      <About />
      <HowIWork />
      <Now />
      <Skills />
      <Services />
      <Experience />
      <Projects />
      <Education />
      <Contact />
    </>
  );
}
