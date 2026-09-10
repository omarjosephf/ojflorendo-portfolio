import type { ProjectItem } from "@/types";

/** Real projects only. Do not invent projects, clients, metrics, or outcomes. */
export const projects: ProjectItem[] = [
  {
    slug: "personal-portfolio-website",
    title: "Personal Portfolio & Professional Platform",
    summary:
      "A website that makes my work easier to explore and gives prospective clients a clear way to get in touch.",
    description:
      "A professional website that brings together my work, background and contact journey. The case study covers content structure, responsive design, accessibility checks and the decisions behind the build.",
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
        "A website that makes my work easier to explore and gives prospective clients a clear way to get in touch.",
      overview:
        "This is my own professional platform. It brings together project case studies, background information and a contact journey in a responsive website. Its development shows how I approach content, interface decisions, accessibility, testing and ongoing improvement.",
      context:
        "I originally built the site to present my work and professional background. Its direction is now shifting towards prospective clients, my own products and sharing the work behind them. The content and design review asks a practical question: can a visitor understand what I offer, inspect relevant work and decide whether to contact me?",
      goals: [
        "Explain the proposed service and who it is for.",
        "Make project evidence and limitations easy to find.",
        "Keep the site usable on phones and with a keyboard.",
        "Provide a clear contact journey and maintainable content.",
      ],
      role:
        "I direct the product decisions, design and development, review the output, and remain responsible for the result. I use AI tools — Claude Code and ChatGPT — to support research, planning, implementation, debugging, and review; their suggestions are checked before acceptance. Architecture, security controls, content, release decisions, and acceptance criteria remain under my authority.",
      process: [
        "Defined the product scope, audience, content model, and security-first delivery plan before implementation.",
        "Built the typed content foundation, design system, security headers, and nonce-based Content Security Policy.",
        "Implemented the main sections, experience timeline, project case studies, and the secure contact boundary.",
        "Explored a procedural 3D hero as progressive enhancement. It was measured, then retired: the current presentation uses typography, project imagery, and finite interaction feedback instead (ADR-0010).",
        "Organise the public content, review the important visitor journeys, and use tests and manual checks to assess changes — keeping each change small enough to inspect and release deliberately.",
      ],
      architecture: [
        "Next.js App Router with React Server Components by default and client components only where interaction requires them.",
        "Typed content modules kept separate from presentation components.",
        "A per-request nonce Content Security Policy generated in the Next.js proxy, with complementary security headers configured centrally.",
        "Build-time font optimisation and no runtime third-party font dependency.",
        "A server-side contact route with a swappable email transport. The 3D renderers remain in the repository with their unit coverage so the decision can be reversed, but no decorative scene is mounted in the current presentation.",
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
        "Decorative elements are kept out of the accessibility tree, and interaction feedback is finite and cancelled by a reduced-motion preference.",
        "A strict nonce-based Content Security Policy is combined with HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.",
        "The contact boundary uses bounded server-side validation, a honeypot, rate limiting, plain-text email output, generic errors, and server-only credentials.",
      ],
      performance: [
        "No continuous decorative canvas or infinite CSS animation is mounted; interaction feedback is bounded and event-driven.",
        "Expensive visual effects and unnecessary compositor layers were reduced after profiling.",
        "Scroll-linked behaviour uses requestAnimationFrame throttling and compositor-friendly transforms rather than per-frame React updates.",
        "Performance choices preserve readable content and navigation when animation is unavailable. The measurements recorded in ADR-0010 came from a 4x-throttled local sample and do not establish real-phone or universal smoothness.",
      ],
      challenges: [
        {
          title: "A strict CSP versus a modern framework",
          body: "A nonce-based Content Security Policy without unsafe-inline scripts requires per-request rendering and deliberate handling of client-side styles. I kept the strict policy and accepted the rendering trade-off rather than weakening the security boundary.",
        },
        {
          title: "A distinctive 3D hero that had to earn its frames",
          body: "A continuously rendering WebGL scene can harm scrolling and input responsiveness. I first kept it as progressive enhancement, capped its work, and paused it when it was not useful. On review the decorative scenes were unmounted altogether (ADR-0010); the source and its unit coverage remain so the decision can be reversed.",
        },
        {
          title: "A distinctive site that still had to state an offer",
          body: "The redesign looked competent but led with my name and a long list of capabilities, which left a visitor unsure what I actually do for them. Rebuilding the page around a stated service, with the supporting background kept but moved below it, turned out to be a content problem rather than a design one.",
        },
      ],
      outcome:
        "A working website with typed content, a responsive interface, project case studies, and an implemented contact boundary — code and decisions a prospective client can inspect. What it does not demonstrate matters too: this is a personal project, not evidence of a client’s revenue, lead growth, or commercial return, and it carries no invented visitor metrics or outcomes. Release evidence belongs to the dated version it was gathered for, and work still in local development is not described here as deployed.",
      lessons: [
        "A visually distinctive site still needs a clear offer. Long skill lists and repeated statements of purpose can make that offer harder to find.",
        "Content, navigation, and the supporting assistant answers have to be reviewed together when the audience changes.",
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
        "Three.js (retained for rollback; no scene currently mounted)",
        "React Three Fiber (retained for rollback)",
        "Drei (retained for rollback)",
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
      "Explore answers alongside the document passages used to produce them.",
    description:
      "A document assistant that retrieves relevant passages, generates an answer, and checks quoted text against the passages supplied to the model. It is designed to decline questions its documents do not cover, and its small evaluation set tests both answerable questions and questions the documents cannot answer.",
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
        "Explore answers alongside the document passages used to produce them.",
      overview:
        "Cited is my document-assistant demo. It retrieves relevant passages, generates an answer, and checks quoted text against the passages supplied to the model. It also tests how the assistant handles questions the documents do not cover. It is deployed as a small containerised web service with a command-line interface, and every claim made about its quality is reproducible from the repository with a single command.",
      context:
        "I wanted to explore a practical limitation of AI question answering: a plausible answer is difficult to trust without seeing what supports it. Ordinary search has the opposite problem — it returns a list of documents and leaves the reading to you. This project investigates retrieval, visible sources, and evaluation within a small, defined document set, and holds the result to a standard where the honesty is measured rather than claimed.",
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
        "The result is a deployed, publicly reachable service with a reproducible quality claim: 100% retrieval hit rate and 80% top-1 on the committed question set, 100% answering accuracy, all unanswerable questions correctly refused, none wrongly refused, and zero citations rejected as unverifiable. Three things are worth keeping apart there. Checking that a quotation appears in a passage is not the same as establishing that the passage supports every claim in the answer, and neither is the same as evidence about documents this system has never seen. The scope is stated plainly rather than glossed: fifteen questions against a ten-chunk corpus, enough to catch regressions and already the cause of three real bug fixes, but not enough to show the system generalises. A business pilot would need suitable documents, a broader test set, human review, and operational requirements agreed in advance.",
      lessons: [
        "Measure the assumption before building on it — the refusal threshold was a reasonable plan that measurement disproved in an afternoon.",
        "An unstable metric is often a broken instrument rather than a broken system; check the scoring before concluding anything about the model.",
        "A guarantee that lives in a vendor's feature list is not yours; re-verifying it locally is what makes it something you can actually promise.",
        "Being honest about the limits of a result costs nothing and is the only thing that makes the result worth quoting — a project premised on checkable claims cannot open with an unverifiable one.",
        "A demo that performs well on its own corpus is evidence about that corpus. Carrying the figure across to somebody else’s documents would be exactly the unchecked confidence this project exists to argue against.",
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
