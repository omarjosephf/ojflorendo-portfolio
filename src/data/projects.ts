import type { ProjectItem } from "@/types";

/** Real projects only. Do not invent projects, clients, metrics, or outcomes. */
export const projects: ProjectItem[] = [
  {
    slug: "personal-portfolio-website",
    title: "Personal Portfolio & Professional Platform",
    summary:
      "A responsive portfolio and personal platform designed to present my work, experience, qualifications, and services while establishing a secure foundation for future AI and content features.",
    description:
      "A responsive, accessible, and security-conscious platform for presenting verified work, experience, qualifications, and services, with structured content and a foundation for future AI and publishing features.",
    status: "Live",
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Vitest",
      "Playwright",
      "Vercel",
      "Resend",
      "AI-assisted engineering",
    ],
    // Pre-sized at 2x the rendered 552x160 card area. Cards fall back to the
    // abstract placeholder when this is null.
    image: "/images/projects/personal-portfolio-website.webp",
    liveUrl: "https://ojfr.me/",
    githubUrl: "https://github.com/omarjosephf/ojflorendo-portfolio",
    featured: true,
    ariaLabel: "Personal Portfolio & Professional Platform case study",
    caseStudy: {
      tagline:
        "Building an accessible and security-conscious professional platform with room for future AI and content features.",
      overview:
        "This portfolio is a single-page professional platform with a dedicated case-study route. It presents my identity, capabilities, experience, qualifications, services, and work, and gives visitors clear, safe ways to get in touch. I developed it as a real product, with accessibility, security, performance, maintainability, and truthful representation treated as first-class requirements.",
      context:
        "As a final-year Computing and IT student pursuing junior, internship, part-time, freelance, and collaborative opportunities, I needed a professional online presence that I control. It had to communicate clearly to employers and potential clients, remain useful without unnecessary tracking, and provide a dependable foundation for future portfolio projects, content, and a narrow AI guide.",
      goals: [
        "Present my profile, capabilities, experience, qualifications, services, and work clearly and honestly.",
        "Provide an accessible and responsive experience across keyboard, screen-reader, reduced-motion, mobile, tablet, and desktop use.",
        "Maintain a small, security-conscious attack surface without unnecessary tracking or persistent user data.",
        "Keep public content in typed data so future projects and case studies can be added coherently.",
      ],
      role:
        "I developed this portfolio through an AI-assisted engineering workflow. Claude Code and ChatGPT supported research, planning, implementation, debugging, and review. I directed the product decisions, approved the changes, verified the output, and remain responsible for the final result. AI-generated suggestions were treated as untrusted until inspected and tested; architecture, security controls, content, release decisions, and acceptance criteria remained under my authority.",
      process: [
        "Defined the product scope, audience, content model, and security-first delivery plan before implementation.",
        "Built the typed content foundation, design system, security headers, and nonce-based Content Security Policy.",
        "Implemented the main sections, procedural 3D hero, experience timeline, project case study, and secure contact boundary.",
        "Measured and improved interaction performance, preserving progressive enhancement and reduced-motion support.",
        "Used local verification, remote CI, preview QA, explicit release approvals, and production smoke testing before publication.",
      ],
      architecture: [
        "Next.js App Router with React Server Components by default and client components only where interaction requires them.",
        "Typed content modules kept separate from presentation components.",
        "A per-request nonce Content Security Policy generated in the Next.js proxy, with complementary security headers configured centrally.",
        "Build-time font optimisation and no runtime third-party font dependency.",
        "A dynamically imported 3D scene as progressive enhancement and a server-side contact route with a swappable email transport.",
      ],
      features: [
        "Responsive and accessible interface with clear navigation and calls to action.",
        "Project case studies and structured, typed public content.",
        "Secure contact handling with server-side validation and honest mock-delivery behaviour.",
        "Technical SEO, metadata routes, structured data, and social preview support.",
        "Automated unit and browser testing.",
        "Strict Content Security Policy, reduced-motion support, and progressive enhancement.",
      ],
      accessibilitySecurity: [
        "Semantic landmarks, a logical heading structure, skip navigation, keyboard support, visible focus, and reduced-motion handling are verified through automated and manual checks.",
        "Decorative 3D and timeline elements are kept out of the accessibility tree.",
        "A strict nonce-based Content Security Policy is combined with HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.",
        "The contact boundary uses bounded server-side validation, a honeypot, rate limiting, plain-text email output, generic errors, and server-only credentials.",
      ],
      performance: [
        "The 3D scene is dynamically imported, frame-rate-capped, and paused when it is off-screen or the tab is hidden.",
        "Expensive visual effects and unnecessary compositor layers were reduced after profiling.",
        "Scroll-linked behaviour uses requestAnimationFrame throttling and compositor-friendly transforms rather than per-frame React updates.",
        "Performance choices preserve readable content and navigation when WebGL or animation is unavailable.",
      ],
      challenges: [
        {
          title: "A strict CSP versus a modern framework",
          body: "A nonce-based Content Security Policy without unsafe-inline scripts requires per-request rendering and deliberate handling of client-side styles. I kept the strict policy and accepted the rendering trade-off rather than weakening the security boundary.",
        },
        {
          title: "A distinctive 3D hero that remains responsive",
          body: "A continuously rendering WebGL scene can harm scrolling and input responsiveness. I kept the visual as progressive enhancement, capped its work, and paused it when it was not useful.",
        },
      ],
      outcome:
        "The result is a live, accessible, security-conscious professional platform that I control and can extend incrementally. It has passed the project quality gates, remote CI, preview review, owner QA, production publication, and post-deployment smoke testing. This case study deliberately avoids invented visitor metrics, client outcomes, or unsupported expertise claims.",
      lessons: [
        "Use primary framework documentation and verify assumptions against the installed version.",
        "Measure before optimising; visible symptoms do not always reveal the main performance cost.",
        "Security, privacy, and accessibility are easier to maintain when included in the product design from the beginning.",
        "Small, reviewable releases produce clearer evidence and safer rollback than large, mixed changes.",
      ],
      stack: [
        "Next.js (App Router)",
        "React",
        "TypeScript (strict)",
        "Tailwind CSS",
        "Framer Motion",
        "Three.js",
        "React Three Fiber",
        "Drei",
        "Vitest",
        "Playwright",
        "Vercel",
        "Resend",
        "AI-assisted engineering with human review",
      ],
    },
  },
];

export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return projects.find((project) => project.slug === slug);
}
