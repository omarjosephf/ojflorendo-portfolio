import type { SiteConfig } from "@/types";

/**
 * Single source of truth for identity, links and contact values.
 * Do not display a street address or private phone number anywhere.
 */
export const site: SiteConfig = {
  name: "OJ Florendo Rayatchi",
  // Rendered on the social preview card; the on-page hero owns its own copy.
  headline: "Websites and AI document assistants for small service businesses.",
  descriptor: "Web developer · AI product builder",
  location: "Windsor, Berkshire, United Kingdom",
  email: "ojflorendo.connect@gmail.com",
  about: [
    "I'm OJ Florendo Rayatchi, a software developer based in Windsor, Berkshire. My work includes websites, document-assistant projects and practical training in AI, Python and data.",
    "My path into technology wasn't straightforward. I found I'm most motivated turning ideas into working products and solving practical problems — and that's still how I work. My background in digital content and e-commerce shapes the questions I ask about a website: what needs explaining, what the visitor needs to do, and how it will be maintained.",
    "I'm developing my own products alongside selected project work. This site is where I share what I build and what I learn from it.",
  ],
  // This path points only to the separately reviewed, phone-free public CV.
  // The editable DOCX source is stored under docs/cv/ for controlled updates.
  cvPath: "/documents/OJ_Florendo_Rayatchi_Public_CV.pdf",
  // The earlier circular profile photograph was retired by the owner.
  // The separately reviewed digital hero portrait is used only in the hero.
  profileImage: null,
  socials: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/ojflorendo",
      icon: "linkedin",
      ariaLabel: "OJ Florendo on LinkedIn (opens in a new tab)",
      external: true,
    },
    {
      label: "GitHub",
      href: "https://github.com/omarjosephf",
      icon: "github",
      ariaLabel: "OJ Florendo on GitHub (opens in a new tab)",
      external: true,
    },
    {
      label: "Email",
      href: "mailto:ojflorendo.connect@gmail.com",
      icon: "email",
      ariaLabel: "Email OJ Florendo",
      external: false,
    },
  ],
  // Mirrors the landing page, with one exception: About is its own route, so
  // the background sections do not compete with the offer. Skills, experience,
  // education and the public CV all live there, one click away.
  nav: [
    { label: "Services", targetId: "services" },
    { label: "Work", targetId: "projects" },
    { label: "About", targetId: "about", href: "/about" },
    { label: "Contact", targetId: "contact" },
  ],
};
