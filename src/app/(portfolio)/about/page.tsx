import type { Metadata } from "next";
import { About } from "@/components/sections/About";
import { Now } from "@/components/sections/Now";
import { Skills } from "@/components/sections/Skills";
import { Experience } from "@/components/sections/Experience";
import { Education } from "@/components/sections/Education";

const title = "About";
const description =
  "OJ Florendo Rayatchi — background, current work, skills, experience and verified credentials behind the websites and AI document assistants he builds.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { type: "profile", url: "/about", title, description },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * Background lives on its own route rather than under the offer.
 *
 * The landing page has one job — state the offer, show the evidence, make the
 * enquiry easy — and every section here answers a different question, asked by
 * someone who has already decided they are interested. Splitting them keeps the
 * landing page short without deleting anything: skills, experience and
 * credentials are all retained in full, one click away.
 *
 * `About` renders the page-level h1 here (see its `as` prop); every other
 * section on this route is an h2 beneath it.
 */
export default function AboutPage() {
  return (
    <>
      <About />
      <Now />
      <Skills />
      <Experience />
      <Education />
    </>
  );
}
