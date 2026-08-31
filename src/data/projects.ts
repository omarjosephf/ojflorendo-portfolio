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
  {
    slug: "cited",
    title: "Cited — Document Assistant",
    summary:
      "A document assistant that answers questions from a set of documents and shows the exact passage each answer came from, or states plainly that the documents do not cover it.",
    description:
      "A retrieval-augmented document assistant built around a single guarantee: every quoted citation is verified locally against the passage the model was actually sent, and questions the documents cannot answer are refused rather than guessed at. Answer quality, refusal behaviour, and citation integrity are scored by a committed evaluation set rather than asserted.",
    status: "Live",
    technologies: [
      "Python",
      "FastAPI",
      "Anthropic API",
      "ONNX",
      "NumPy",
      "Docker",
      "Fly.io",
      "pytest",
      "AI-assisted engineering",
    ],
    // Pre-sized at 2x the rendered 552x160 card area, like the portfolio card.
    image: "/images/projects/cited.webp",
    liveUrl: "https://cited-demo.fly.dev",
    githubUrl: "https://github.com/omarjosephf/cited",
    featured: true,
    ariaLabel: "Cited — Document Assistant case study",
    caseStudy: {
      tagline:
        "Answers you can check: every citation is verified against the passage the model was sent, and questions the documents cannot answer are refused.",
      overview:
        "Cited answers questions about a set of documents and shows the exact passage each answer came from. When the documents do not contain the answer, it says so instead of producing a plausible one. It is deployed as a small containerised web service with a command-line interface, and every claim made about its quality is reproducible from the repository with a single command.",
      context:
        "Most demonstrations of this kind answer confidently whether or not they should, and ask you to trust a citation the model generated about itself. Ordinary search has the opposite problem: it returns a list of documents and leaves the reading to you. I wanted to build the version that is actually useful in a working context — one that returns the answer, shows its source, and is honest about the limits of what it was given — and to hold it to a standard where the honesty is measured rather than claimed.",
      goals: [
        "Return answers grounded in supplied documents, with the source passage shown alongside each answer.",
        "Refuse questions the documents cannot answer, and treat wrongly refusing an answerable question as an equally real failure.",
        "Make every quality claim reproducible from a committed question set with one command.",
        "Keep running costs and the operational attack surface small enough for a public demo to be safe to expose.",
      ],
      role:
        "I designed, built, evaluated, and deployed this project through an AI-assisted engineering workflow, with Claude Code supporting research, implementation, and review. The architectural decisions, the measurements that drove them, the honesty standard applied to the documentation, and the release itself were mine, and I remain accountable for the result. AI-generated work was treated as untrusted until read and tested — a discipline this project depends on more than most, since its entire premise is that a confident answer is not the same as a correct one.",
      process: [
        "Proved the embedding stack ran on the target platform before writing any code that depended on it.",
        "Built ingestion, chunking, and retrieval, and measured retrieval quality before adding a language model.",
        "Added answering with citations computed by the API, then added a local verification step that re-checks every quote independently.",
        "Scored the system against a committed question set, which surfaced three real bugs — including one that was in the scoring rather than the model.",
        "Containerised the service, sized the deployment against measurements, and added the protections a publicly reachable paid endpoint needs.",
      ],
      architecture: [
        "Documents are read into passages that remain individually citable, with paths relative to the corpus root so identically named files stay distinguishable.",
        "Embeddings run locally through ONNX rather than a hosted API, so retrieval adds no per-query cost and introduces no second vendor.",
        "Retrieval is NumPy cosine similarity behind a Retriever interface — at this corpus size a vector database is complexity without benefit, and the interface keeps the upgrade cheap.",
        "Answering uses the Anthropic API's native citations, computed against the passages actually supplied, then re-verifies every quote locally so the guarantee lives in this repository rather than in a vendor's feature list.",
        "The HTTP layer owns transport, protection, and presentation only; it decides nothing about answers, which keeps the core usable as a library and makes a different deployment a wrapper rather than a rewrite.",
      ],
      features: [
        "Question answering with the source passage shown for every claim.",
        "Measured refusal: unanswerable questions are declined, and wrongly refused answerable questions are scored as failures too.",
        "Local citation verification that discards and counts any quote not present in the passage sent.",
        "A committed evaluation set scored by one command, with failing cases printed.",
        "A command-line interface whose retrieval and indexing commands run with no API key and at no cost.",
        "A containerised HTTP service with rate limiting, a daily answer budget, and a question length cap.",
      ],
      accessibilitySecurity: [
        "The service sends a nonce-based Content Security Policy alongside HSTS, X-Content-Type-Options, and Referrer-Policy.",
        "Spend is bounded in three independent ways — request rate, a daily answer budget, and a cap on the size of any single question — and the documentation is explicit that only a provider-level spend cap truly bounds the loss, because the in-process budget resets on restart.",
        "The build fails if a secret reaches a tracked file, and a test guards the corpus against ignore rules that could silently empty it.",
        "The demo interface is deliberately small and has the basics right — a language attribute, a single main heading, visible focus styling, and colour-scheme support — but it has not been through a full accessibility audit, and I would not describe it as meeting the standard the rest of my work is held to until it has.",
      ],
      performance: [
        "The embedding stack runs through ONNX rather than PyTorch — 223 MB against roughly 2 GB — and was verified working on the target Python version and platform before anything depended on it.",
        "Embeddings are computed locally, so the retrieval path costs nothing per query and does not depend on a second provider being available.",
        "Claude Haiku 4.5 answers from four short passages at roughly a fifth of the cost of an Opus-tier model, on the reasoning that reading four short passages is comprehension rather than reasoning — a judgement the evaluation set then checked rather than assumed.",
        "The deployed machine was sized against measurements rather than assumptions, after an initial guess proved wrong.",
      ],
      challenges: [
        {
          title: "A similarity threshold cannot tell you what is answerable",
          body: "The plan was to refuse questions whose best retrieval score fell below a cutoff. Measurement killed it: the lowest-scoring answerable question scored 0.666 while the highest-scoring unanswerable one scored 0.755, because that question was topically adjacent to a document without being covered by it. The ranges overlap, so no cutoff separates them. Embedding similarity measures topical relatedness, not answerability — a property of the technique, not a threshold left untuned — so refusal became a judgement the model makes after reading the passages, with a score threshold surviving only as a cheap pre-filter for the obviously unrelated.",
        },
        {
          title: "Trusting a citation the model wrote about itself",
          body: "Asking a model to include its source and hoping produces citations that look right and cannot be checked. Citations here are computed by the API against the documents actually supplied, and then every quote is re-verified locally against the passage that was sent; a quote that does not appear in it is discarded and counted. That check has never fired, which is exactly the point — it is the mechanism by which I would find out if it stopped being true.",
        },
        {
          title: "An unstable score that was not the model's fault",
          body: "Answering accuracy oscillated between 93% and 100% across runs, which looked like model variance. It was not: the scoring was inferring refusals rather than detecting them, so borderline phrasings were graded inconsistently. Introducing an explicit refusal marker stabilised the figure at 100% across five consecutive runs. The lesson generalised — before trusting a measurement, check that the instrument is measuring what you think it is.",
        },
      ],
      outcome:
        "The result is a deployed, publicly reachable service with a reproducible quality claim: 100% retrieval hit rate and 80% top-1 on the committed question set, 100% answering accuracy, all unanswerable questions correctly refused, none wrongly refused, and zero citations rejected as unverifiable. The scope of that claim is stated plainly rather than glossed: it is fifteen questions against a ten-chunk corpus, which is enough to catch regressions and has already found three real bugs, but not enough to show the system generalises. A larger corpus is the obvious next test, and the evaluation set is the thing that would tell me if it failed.",
      lessons: [
        "Measure the assumption before building on it — the refusal threshold was a reasonable plan that measurement disproved in an afternoon.",
        "An unstable metric is often a broken instrument rather than a broken system; check the scoring before concluding anything about the model.",
        "A guarantee that lives in a vendor's feature list is not yours; re-verifying it locally is what makes it something you can actually promise.",
        "Being honest about the limits of a result costs nothing and is the only thing that makes the result worth quoting — a project premised on checkable claims cannot open with an unverifiable one.",
      ],
      stack: [
        "Python",
        "FastAPI",
        "Anthropic API (Claude Haiku 4.5)",
        "fastembed / ONNX Runtime",
        "NumPy",
        "Docker",
        "Fly.io",
        "pytest",
        "GitHub Actions",
        "AI-assisted engineering with human review",
      ],
    },
  },
];

export function getProjectBySlug(slug: string): ProjectItem | undefined {
  return projects.find((project) => project.slug === slug);
}
