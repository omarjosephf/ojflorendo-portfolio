import type { SiteConfig } from "@/types";

/**
 * Single source of truth for identity, links and contact values (CLAUDE.md §5).
 * Do not display a street address or phone number anywhere (CLAUDE.md §3/§14).
 */
export const site: SiteConfig = {
  name: "OJ Florendo",
  headline:
    "Building practical digital solutions with software, AI, data, and design.",
  descriptor:
    "Final-Year Computing & IT Student | AI & Python Training | Data Analysis | Digital Technology",
  location: "Windsor, Berkshire, United Kingdom",
  email: "ojflorendo.connect@gmail.com",
  about: [
    "I'm a final-year BSc Computing and IT (Software) student at the Open University, working across software, AI, data analysis and digital marketing. I enjoy turning technical ideas into clear, useful things — whether that's a Python example, a data explanation, or a well-structured web page.",
    "Alongside my degree I've delivered professional training in Python, data science and AI, developed course and marketing content for executive training programmes, and run day-to-day e-commerce and social content for small business brands. I'm building a portfolio of software, website, AI and data projects, and I'm open to junior, internship, part-time, remote, freelance and collaborative opportunities.",
  ],
  // No public, phone-free CV has been supplied yet, so the "View CV" control is
  // hidden (the private CV must NOT be published). Once a redacted, phone-free
  // PDF is added under public/documents/, set this to its path, e.g.
  // "/documents/oj-florendo-cv.pdf".
  cvPath: null,
  // Drop a photo into public/images/profile/ and set this to e.g.
  // "/images/profile/omar.jpg" to replace the monogram placeholder in the hero.
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
