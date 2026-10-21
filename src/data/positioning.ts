import { story } from "./story";

export const positioning = {
  professionalName: "Joseph Florendo",
  hero: {
    // The role and place, shown above the name.
    role: "AI Automation Developer in Windsor, UK, working worldwide",
    /** Display wordmark: the name, set large. */
    displayName: ["Joseph", "Florendo"],
    // The owner's niche line of 20 October 2026, word for word.
    headline: [
      "I help founders and creators who built with AI tools",
      "make their app or automation safe, solid and ready to launch, then automate the busywork.",
    ],
    primaryCta: "Get your app checked",
    secondaryCta: "See my work",
    availability:
      "Taking on build checks, fixes and automation now, remotely and worldwide. Scope and timing agreed individually.",
    locationNote: "Windsor, Berkshire · Working remotely",
  },
  /**
   * A real three-step sequence, so the numbers carry meaning. Wording describes
   * how the work is done, not results for past clients.
   */
  howIWork: {
    intro:
      "Three steps, from an app you built with AI to one you can launch with confidence.",
    principle:
      "You work directly with me. I stay responsible for what I check, fix and hand over.",
    steps: [
      {
        title: "Tell me what you built",
        description:
          "What it does, who uses it, and which tools you built it with. A rough description is enough; no technical brief needed.",
      },
      {
        title: "I check it and rank the fixes",
        description:
          "About two days of review: code, database rules, logins, secret keys, payments and running costs. You get a ranked fix list with time estimates, and a 30-minute call.",
      },
      {
        title: "Fix it, launch it, then automate",
        description:
          "I fix what you choose at a fixed price, re-check it, and set up error alerts and spending caps. Then we automate the busywork, with you approving anything that matters.",
      },
    ],
  },
  services: {
    intro:
      "Start with a build check. It tells you what to fix before launch, and what each fix would cost. Every price is the total you pay.",
    /**
     * Four offers in the owner's order (ADR-0031, amending ADR-0029 D3), each
     * with a §6.2 label. Every price is copied from the owner-approved pricing
     * of 21 October 2026; the unit test pins each amount to that table. Copy
     * states what is offered and what has been built, never client results.
     */
    offers: [
      {
        title: "AI build check",
        status: "Available now",
        price: "£950 (US$1,275)",
        priceDetail:
          "Founding price for my first five clients: £760 (US$1,020), in return for a published case study.",
        description:
          "About two days of review by me, not just a scanner. I check what you built, then walk you through what to fix first.",
        includes: [
          "A review of your app's code",
          "Database rules, logins and secret keys",
          "Payments and running costs",
          "A ranked fix list with time estimates",
          "A 30-minute call to go through it",
          "For apps with a chatbot or AI agent: an AI answer test, +£450 (US$600). I test for made-up answers, leaked data and prompt injection (tricking the AI into breaking its rules).",
        ],
      },
      {
        title: "Fixes before launch",
        status: "Available now",
        price: "From £1,000 (US$1,350)",
        priceDetail:
          "£500 per day in the quote, minimum two days. £250 off if you book within 30 days of your check.",
        description:
          "I fix what's on your list, test each fix and re-check the app. A fixed price, agreed in writing before I start.",
        includes: [
          "Fixes from your list, each tested",
          "A re-check once they're done",
          "Or the launch-ready bundle, £3,150 (US$4,200): the check, up to 4 days of fixes, launch setup (error alerts, spending caps, a backup check) and 2 weeks of help with anything my fixes affect. Unused fix days are refunded at £500 each.",
        ],
      },
      {
        /**
         * Evidence named in the copy is what has been built and deployed: the
         * blog's agents draft posts that the owner approves before anything
         * publishes, and Cited answers from documents with the source shown.
         */
        title: "Then automate the busywork",
        status: "Available now",
        price: "From £1,000 (US$1,350)",
        priceDetail:
          "For one automation. An AI agent that asks you before it acts, from £2,500 (US$3,350).",
        description:
          "Once your app is solid, I take repetitive work off you. I build and run this kind of system myself: a team of AI agents drafts the posts on my blog for me to approve, and Cited answers from documents with the source shown.",
        includes: [
          "Built in code you own, with no per-task fees",
          "Tested on real examples before it goes live",
          "An approval step for anything that matters",
          "Error alerts and spending caps",
          "A handover guide",
        ],
      },
      {
        // No reply-time promise until the enquiry triage automation is live.
        title: "Care plan",
        status: "Available now",
        price: "£195 (US$260) a month",
        priceDetail: "Cancel with 30 days' notice.",
        description:
          "Keeps a launched app healthy. Only for apps I've checked or built. It's not an emergency service.",
        includes: [
          "Security updates, error logs, spending and backups checked monthly",
          "Up to 2 hours of small fixes",
          "A short monthly report",
        ],
      },
    ],
    /**
     * v0 is left out until its code export has been checked; n8n, Make and
     * Zapier are not offered yet (pricing paper §3).
     */
    scopeNote:
      "What I check: apps built with Lovable, Bolt, Cursor, Claude Code or similar tools, usually React or Next.js with a Supabase database, plus any AI chatbot or agent inside them. Every fix or build starts with a defined task and a written quote that says what it doesn't cover. Anything that handles personal data gets its own privacy review, agreed before work starts.",
    priceNote:
      "Every price is the total. I'm not VAT-registered, so no VAT is added. Your app's hosting and AI costs stay in your own accounts; I estimate them in your check.",
    foundingNote:
      "Founding offer: my first five clients get 20% off the first thing they buy, in return for permission to publish an honest case study. Care plans aren't discounted.",
    relatedWork:
      "I also build websites, run AI, Python and data training for professional groups, and have worked in digital content and e-commerce operations.",
  },
  /**
   * The hero's example run. Synthetic by design and labelled as such on the
   * page: it shows what a typical build check finds, not a client's app.
   */
  exampleRun: {
    title: "An example build check",
    caption: "An illustration of what a check looks at, not a client's app.",
    steps: [
      { title: "Logins and database rules", detail: "Found: any signed-in user can read every customer's records. Fix first, about 2 hours." },
      { title: "Secret keys", detail: "Found: the payment key is sent to every visitor's browser. Move it to the server, about 1 hour." },
      { title: "Running costs", detail: "Found: no spending cap on AI calls. Add a cap and an alert, about 1 hour." },
      { title: "Your fix list", detail: "Ranked by risk, with time estimates, and a 30-minute call to go through it." },
    ],
  },
  /**
   * The Work section. Every item is real and live except Learn Your Way, which
   * is labelled in progress. Case-study links exist only for Cited and the
   * portfolio; the blog links to /blog and E.V opens the assistant.
   */
  work: {
    heading: "Work you can check",
    intro:
      "Four are live and one is in progress, built in public. Try the demo, read the case studies or ask E.V how they work.",
    cited: {
      title: "Cited",
      kind: "Document assistant",
      status: "Live",
      summary:
        "Answers questions from a set of documents and shows the exact passage behind every answer. Questions the documents can't answer are refused, not guessed.",
      fact:
        "On its fixed 15-question test set, every answerable question was answered correctly and every out-of-scope question was refused.",
      demoUrl: "https://cited-demo.fly.dev",
      caseStudySlug: "cited",
      image: "/images/projects/cited.webp",
    },
    blog: {
      title: "A blog written by AI agents, approved by me",
      kind: "Multi-agent system",
      status: "Live",
      summary:
        "Agents suggest ideas, research, write and review posts from my own material. Nothing is published until I read it and approve it.",
      agents: ["Idea Scout", "Researcher", "Writer", "SEO review", "Reviewer", "Critique"],
      approver: "Joseph approves",
      href: "/blog",
    },
    ev: {
      title: "E.V and its admin panel",
      kind: "Assistant on this site",
      status: "Live",
      summary:
        "E.V answers questions about my work from my published documents, with sources. I run it from an owner-only admin panel.",
    },
    learnYourWay: {
      title: "Learn Your Way",
      kind: "My first product",
      status: "In progress",
      summary:
        "Turns any study material into lessons you can read, watch or listen to. Everyone learns differently, so you choose the way that suits you, and studying becomes something to enjoy.",
      note: "Built in public.",
    },
    portfolio: {
      title: "This website",
      kind: "Portfolio platform",
      status: "Live",
      summary:
        "Built with Next.js and TypeScript, tested on every change and served under a strict security policy.",
      caseStudySlug: "personal-portfolio-website",
      sourceUrl: "https://github.com/omarjosephf/ojflorendo-portfolio",
    },
  },
  assistant: {
    heading: "Ask E.V about my work",
    body:
      "E.V is the assistant on this site. It answers from my published documents and shows the source behind each answer. If the documents don't cover a question, it says so instead of guessing.",
    action: "Ask E.V a question",
    example: {
      question: "What does Cited do?",
      answer:
        "Cited answers questions from a set of documents and shows the passage each answer came from. It refuses questions the documents don't cover.",
      source: "Cited — Document Assistant",
    },
    exampleLabel: "An example of how E.V answers.",
  },
  why: {
    heading: "Why I build this",
    body: story.short,
    link: "Read the full story",
  },
  contact: {
    heading: "What did you build?",
    supportingCopy:
      "Tell me what your app does, which tools you built it with and when you want to launch. I'll tell you whether a build check fits and what it would cover.",
    reassurance:
      "You don't need a technical brief. A rough description and a link are enough to start.",
    secondary:
      "Already launched, and want to automate the busywork? Describe the task you repeat and what a finished job looks like.",
    asideCopy:
      "You can send the same details by email. I confirm the scope and price in writing before any work starts.",
  },
  /** The home page's search description; under 160 characters (ADR-0031 D5). */
  seoDescription:
    "Joseph Florendo checks and fixes apps built with AI tools like Lovable, Bolt and Cursor, so founders can launch safely, then automates the busywork.",
  /** Third-person descriptor used by structured data. */
  personDescription:
    "Joseph Florendo is an AI automation developer in Windsor, UK. He helps founders who built with AI tools make their apps safe and ready to launch, then automates the busywork.",
} as const;
