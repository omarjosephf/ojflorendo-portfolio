import type { SiteConfig } from "@/types";

/**
 * Single source of truth for identity, links and contact values.
 * Do not display a street address or private phone number anywhere.
 *
 * The public name is Joseph Florendo (ADR-0029). The domain, the email address
 * and the social handles still use `ojflorendo` until each is changed on purpose.
 */
export const site: SiteConfig = {
  name: "Joseph Florendo",
  // Rendered on the social preview card; the on-page hero owns its own copy.
  headline: "AI automations that take repetitive work off your business.",
  descriptor: "AI Automation Developer",
  location: "Windsor, Berkshire, United Kingdom",
  email: "ojflorendo.connect@gmail.com",
  about: [
    "I'm Joseph Florendo, an AI automation developer based in Windsor, Berkshire. I build automations, AI agents and assistants that take repetitive work off businesses, and I show how each one works.",
    "I have taught AI, Python and data courses to professional groups, and I'm in the final year of a BSc in Computing and IT with The Open University.",
    "I build in public. The E.V assistant, the agent-written blog and the panel I run them from are live on this site, and I share how they are made.",
  ],
  // This path points only to the separately reviewed, phone-free public CV.
  // The editable DOCX source is stored under docs/cv/ for controlled updates.
  // The file still carries the previous name until the CV phase (ADR-0029).
  cvPath: "/documents/OJ_Florendo_Rayatchi_Public_CV.pdf",
  // The earlier circular profile photograph was retired by the owner.
  // The separately reviewed digital hero portrait is used only in the hero.
  profileImage: null,
  socials: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/ojflorendo",
      icon: "linkedin",
      ariaLabel: "Joseph Florendo on LinkedIn (opens in a new tab)",
      external: true,
    },
    {
      label: "GitHub",
      href: "https://github.com/omarjosephf",
      icon: "github",
      ariaLabel: "Joseph Florendo on GitHub (opens in a new tab)",
      external: true,
    },
    {
      label: "Email",
      href: "mailto:ojflorendo.connect@gmail.com",
      icon: "email",
      ariaLabel: "Email Joseph Florendo",
      external: false,
    },
  ],
  // About and Blog are their own routes; the rest are landing-page sections.
  nav: [
    { label: "Services", targetId: "services" },
    { label: "Work", targetId: "projects" },
    { label: "Blog", targetId: "blog", href: "/blog" },
    { label: "About", targetId: "about", href: "/about" },
    { label: "Contact", targetId: "contact" },
  ],
};
