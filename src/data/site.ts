import type { SiteConfig } from "@/types";

/**
 * Single source of truth for identity, links and contact values.
 * Do not display a street address or private phone number anywhere.
 */
export const site: SiteConfig = {
  name: "OJ Florendo Rayatchi",
  headline: "I build practical digital products with software and AI.",
  descriptor: "Software Developer · AI-Focused Builder · Creative Developer",
  location: "Windsor, Berkshire, United Kingdom",
  email: "ojflorendo.connect@gmail.com",
  about: [
    "I am a software developer, AI-focused builder, and creative developer with experience across web development, Python, data, UX/UI, professional training, digital marketing, e-commerce, and social-media operations.",
    "My path into technology was not straightforward. Over time, I discovered that I am most motivated when I am turning ideas into working products, solving practical problems, and learning through the process of building. Artificial intelligence has become an important part of that direction—not as a substitute for judgement, but as a tool for researching, prototyping, debugging, and working more effectively.",
    "I care about the people who will use what I create, not only the code behind it. I aim to communicate honestly, take responsibility for the final result, and build solutions that are clear, useful, accessible, and dependable.",
  ],
  // This path points only to the separately reviewed, phone-free public CV.
  // The editable DOCX source is stored under docs/cv/ for controlled updates.
  cvPath: "/documents/OJ_Florendo_Rayatchi_Public_CV.pdf",
  // A real profile photograph remains pending. The assistant avatar is reserved
  // for OJ Assistant and must not silently replace the human profile image.
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
  nav: [
    { label: "About", targetId: "about" },
    { label: "Skills", targetId: "skills" },
    { label: "Experience", targetId: "experience" },
    { label: "Projects", targetId: "projects" },
    { label: "Education", targetId: "education" },
    { label: "Contact", targetId: "contact" },
  ],
};
