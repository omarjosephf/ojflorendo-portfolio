import type { ProjectItem } from "@/types";

/**
 * Real projects only (CLAUDE.md §3/§9 — do not invent projects or outcomes).
 * The portfolio site itself is the first genuine featured project and has a full
 * case study. To add a future project, append a new object here.
 */
export const projects: ProjectItem[] = [
  {
    slug: "personal-portfolio-website",
    title: "Personal Portfolio Website",
    summary:
      "A responsive portfolio and CV website presenting my experience, skills, qualifications and future projects.",
    description:
      "Designed and built as my first featured project: a modern, accessible, security-conscious personal site with a procedural 3D hero, typed content model, strict security headers and a Content Security Policy.",
    status: "In development",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
      "Three.js",
      "React Three Fiber",
      "Claude Code",
    ],
    image: null,
    liveUrl: null,
    githubUrl: null,
    featured: true,
    ariaLabel: "Personal Portfolio Website case study",
    caseStudy: {
      tagline:
        "Building a fast, accessible and security-conscious personal site — my first featured project.",
      overview:
        "This portfolio is a single-page personal website with a dedicated case-study route. It presents who I am, my skills and experience, and my work, and gives visitors clear, safe ways to get in touch. I built it as a real product: designed, engineered, tested and documented, with accessibility and security treated as first-class requirements rather than afterthoughts.",
      context:
        "As a final-year Computing and IT student looking for junior, internship and freelance opportunities, I needed a professional online presence that I fully control. It had to load quickly, work for everyone, be safe to put my name behind, and be easy to keep extending as I complete more projects.",
      goals: [
        "Present my profile, skills, experience and qualifications clearly and honestly.",
        "Make it genuinely accessible (keyboard, screen reader, reduced motion) and responsive across phones, tablets and large monitors.",
        "Keep it fast, with a small, secure attack surface and no unnecessary tracking.",
        "Structure content as typed data so future projects and case studies are easy to add.",
      ],
      role:
        "I was the sole developer and designer. I built the site using AI-assisted development (Claude Code) as a pair-programmer — I set the direction and requirements, made the design and architecture decisions, reviewed the generated code, and did the configuration, testing and verification myself. It is honest to say the work was AI-assisted; it would be dishonest to claim every line was typed by hand without help, or that no judgement or review was involved.",
      process: [
        "Planned the scope, content model and a security-first, phased build before writing code.",
        "Built the foundation: typed content data, the design system, security headers and a nonce-based Content Security Policy.",
        "Implemented the sections, the procedural 3D hero, the experience timeline and the contact flow.",
        "Measured performance with a repeatable browser harness, then optimised based on the findings.",
        "Verified accessibility, security headers, the CSP and behaviour across target viewports.",
      ],
      architecture: [
        "Next.js App Router with React Server Components by default; client components only where interactivity is needed.",
        "All content lives in typed data modules, kept separate from presentation.",
        "A per-request nonce Content Security Policy is generated in a proxy (Next.js 16's replacement for middleware); other security headers are set in the Next config.",
        "Fonts are self-hosted at build time, so there is no runtime request to a third-party font service.",
        "The 3D scene is a dynamically-imported client component; the contact route is a server route with a swappable email transport.",
      ],
      features: [
        "A dark, restrained design system with a teal/blue accent.",
        "A procedural “Digital Core” 3D hero with an attractive CSS fallback.",
        "An experience timeline with a scroll-linked progress marker.",
        "An accessible contact form with server-side validation, plus direct email, LinkedIn and GitHub links.",
        "Responsive layouts from small phones to large monitors, with no horizontal overflow.",
      ],
      accessibilitySecurity: [
        "Targets WCAG 2.2 AA: semantic landmarks, a single logical H1, a skip link, full keyboard support, visible focus and reduced-motion handling; automated axe checks report no violations.",
        "Decorative elements (the 3D canvas, timeline marker and nodes) are hidden from assistive technology.",
        "Strict Content Security Policy with a per-request nonce and no unsafe-inline scripts, plus HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy.",
        "No secrets in the codebase; the contact form uses a honeypot and rate limiting and never exposes an email key to the browser.",
      ],
      performance: [
        "The 3D scene is dynamically imported, capped to a lower frame rate, and fully paused when it is off-screen or the tab is hidden.",
        "Removed a large number of expensive backdrop-filter blurs and permanent compositor layers that were contributing to scroll and interaction lag.",
        "Replaced a per-event scroll listener with a requestAnimationFrame-throttled one, and drives the timeline with compositor-friendly transforms instead of per-frame React updates.",
        "Optimisations were validated with a repeatable before/after browser profiling harness. A production Lighthouse audit on the deployed site is planned as a later step, since a software-rendered local environment is not representative.",
      ],
      challenges: [
        {
          title: "A strict CSP versus a modern framework",
          body: "Enforcing a nonce-based Content Security Policy with no unsafe-inline scripts means pages are rendered per request rather than as a static export, and required rendering some animated elements on the client so their inline styles are applied via the CSSOM rather than blocked at parse. I chose to keep the strict policy and accept the rendering trade-off rather than weaken security.",
        },
        {
          title: "An impressive 3D hero that stays responsive",
          body: "A continuously rendering WebGL scene can hurt scrolling and input responsiveness. I kept the visual but made it demand-driven, frame-rate-capped and paused when not visible, prioritising interaction responsiveness over decorative movement.",
        },
      ],
      outcome:
        "The result is a running, accessible, security-conscious portfolio that I control and can keep extending. It passes linting, type-checking and a production build, reports no accessibility violations in automated checks, and serves a tested set of security headers with an enforced CSP. I have deliberately not invented metrics such as visitor counts, client names or business results — this case study describes the engineering, not marketing claims.",
      lessons: [
        "Read the framework's own documentation first — this project uses a Next.js version with real breaking changes from older guides.",
        "Measure before optimising: profiling showed the real cost was in compositing (backdrop blur and layers), not only the 3D scene.",
        "Security and accessibility are easier when designed in from the start than bolted on later.",
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
        "Claude Code (AI-assisted development)",
      ],
    },
  },
];

/** Look up a project by its slug. */
export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return projects.find((p) => p.slug === slug);
}
