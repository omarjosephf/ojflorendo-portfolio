import type { Metadata } from "next";
import { AboutArrival } from "@/components/about/AboutArrival";
import { AboutBuilding, AboutOrigin, AboutTeaching } from "@/components/about/AboutStages";
import { AboutSkyLazy } from "@/components/about/AboutSkyLazy";
import { Experience } from "@/components/sections/Experience";
import { Skills } from "@/components/sections/Skills";
import { Now } from "@/components/sections/Now";
import { Education } from "@/components/sections/Education";

const title = "About";
const description =
  "Joseph Florendo, AI automation developer: his story, the systems he runs, his training work, experience and verified credentials.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { type: "profile", url: "/about", title, description },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * The About page is a journey in seven stages: arrival, origin, teaching,
 * building, experience (with skills), now, and education and credentials.
 * A 3D star scene behind it moves one stage at a time (ADR-0030); every stage
 * is complete without it. Section ids are stable because E.V's sources and
 * the navigation link to them.
 */
export default function AboutPage() {
  return (
    <div className="jf-about">
      <AboutSkyLazy />
      <AboutArrival />
      <AboutOrigin />
      <AboutTeaching />
      <AboutBuilding />
      <Experience />
      <Skills />
      <Now />
      <Education />
    </div>
  );
}
