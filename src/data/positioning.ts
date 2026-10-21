import { story } from "./story";

export const positioning = {
  professionalName: "Joseph Florendo",
  hero: {
    // The role and place, shown above the name.
    role: "AI Automation Developer in Windsor, UK, working worldwide",
    /** Display wordmark: the name, set large. */
    displayName: ["Joseph", "Florendo"],
    // The owner's chosen line of 21 October 2026 (ADR-0032), word for word.
    headline: [
      "I design and build AI agents and automations for businesses and creators,",
      "and I make games, all built in public.",
    ],
    primaryCta: "Start a project",
    secondaryCta: "See my work",
    availability:
      "Taking on AI automation and agent projects now, remotely and worldwide. Scope, timing and price agreed individually.",
    locationNote: "Windsor, Berkshire · Working remotely",
  },
  /**
   * A real three-step sequence, so the numbers carry meaning. Wording describes
   * how the work is done, not results for past clients.
   */
  howIWork: {
    intro:
      "Three steps, from a task you repeat to a system that does it for you.",
    principle:
      "You work directly with me. I stay responsible for what I build and hand over.",
    steps: [
      {
        title: "Tell me the task",
        description:
          "What you do again and again, which tools you use, and what a finished job looks like. A rough description is enough; no technical brief needed.",
      },
      {
        title: "A free call, then a written quote",
        description:
          "We talk it through on a free 30-minute call. Then I send a written quote with the scope, timing and price, before any work starts.",
      },
      {
        title: "I build it, test it and hand it over",
        description:
          "Built in code you own and tested on real examples, with an approval step for anything that matters. You get error alerts, spending caps and a handover guide.",
      },
    ],
  },
  services: {
    intro:
      "I build the systems that take repetitive work off your business. Every project is different, so I quote each one after a free call, in writing, before any work starts.",
    /**
     * Four offers in the owner's order (ADR-0032, amending ADR-0031 D1), each
     * with a §6.2 label. The owner builds; he does not check or fix other
     * people's apps. No offer carries a fixed price: each is quoted per project,
     * and the unit test blocks any amount from returning. Copy states what is
     * offered and what has been built, never client results.
     */
    offers: [
      {
        /**
         * Evidence named in the copy is what has been built and deployed: the
         * blog's agents draft posts that the owner approves before anything
         * publishes.
         */
        title: "AI automations and workflows",
        status: "Available now",
        description:
          "I take the tasks you repeat every week off your hands: moving data between tools, reports, follow-ups and first drafts. I build and run this kind of system myself: a team of AI agents drafts the posts on my blog for me to approve.",
        includes: [
          "Built in code you own, with no per-task fees",
          "Tested on real examples before it goes live",
          "An approval step for anything that matters",
          "Error alerts and spending caps",
          "A handover guide",
        ],
      },
      {
        // Cited and E.V are live; both answer only from their documents.
        title: "AI agents",
        status: "Available now",
        description:
          "Agents that read, decide and draft, then ask you before they act. Cited answers from documents and shows the source behind every answer, and E.V answers questions about my work on this site.",
        includes: [
          "Answers from your own documents, with sources",
          "Says so when your documents don't cover a question",
          "Asks you before it sends, posts or spends anything",
        ],
      },
      {
        // Future roadmap until the owner's first game is released (ADR-0032 D2).
        title: "Games",
        status: "Future roadmap",
        description:
          "I'm building my first Roblox game with Roblox Studio and Claude Code, in public. Game projects open once it's released.",
        includes: [
          "Follow the build from first idea to release",
        ],
      },
      {
        // No reply-time promise until the enquiry triage automation is live.
        title: "Websites and care plans",
        status: "Available now",
        description:
          "I also build websites like this one. For anything I've built, a monthly care plan keeps it healthy. It's not an emergency service.",
        includes: [
          "Built with Next.js and TypeScript, tested on every change",
          "Care plan: updates, error logs, spending and backups checked monthly, plus small fixes",
        ],
      },
    ],
    /**
     * n8n, Make and Zapier are not offered yet: the owner builds in code. The
     * public-build line exists because building in public is the brand, and a
     * client must know their details stay private.
     */
    scopeNote:
      "Every project starts with a defined task and a written quote that says what it includes and what it doesn't. Anything that handles personal data gets its own privacy review, agreed before work starts. I build in public, but I never share your data or details without your permission.",
    priceNote:
      "Each quote is the total you pay. I'm not VAT-registered, so no VAT is added. Your hosting and AI running costs stay in your own accounts; I estimate them in the quote.",
    foundingNote:
      "Founding offer: my first five clients get 20% off their first project, in return for permission to publish an honest case study. Care plans aren't discounted.",
    relatedWork:
      "I also run AI, Python and data training for professional groups, and have worked in digital content and e-commerce operations.",
  },
  /**
   * The hero's example run. Synthetic by design and labelled as such on the
   * page: it shows how an agent handles one enquiry, not a client's system.
   */
  exampleRun: {
    title: "An example automation",
    caption: "An illustration of how an automation runs, not a client's system.",
    steps: [
      { title: "A new enquiry arrives", detail: "It's saved, and an acknowledgement goes out straight away." },
      { title: "An agent drafts the reply", detail: "From your own notes and prices, with the source for each answer." },
      { title: "Your phone gets an alert", detail: "It shows the enquiry type and how urgent it is." },
      { title: "You approve it", detail: "Nothing is sent until you've read it and said yes." },
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
  /**
   * "Your questions" (owner-approved 20 October 2026). Each answer restates
   * what the services and How it works already say; nothing new is promised,
   * and there is no reply time until the enquiry triage automation is live.
   */
  questions: {
    heading: "Your questions",
    intro: "Straight answers to what people ask before they start a project.",
    items: [
      {
        question: "Do I need to be technical?",
        answer:
          "No. Describe the task in your own words. I'll ask which tools you use and what a finished job looks like, then explain the plan in plain language.",
      },
      {
        question: "How much does a project cost?",
        answer:
          "Every project is quoted after a free 30-minute call, in writing, before any work starts. The quote is the total you pay. Your hosting and AI running costs stay in your own accounts, and I estimate them in the quote.",
      },
      {
        question: "How long does a build take?",
        answer:
          "It depends on the task. The written quote states the timing, and I share progress as I build so you can check the work along the way.",
      },
      {
        question: "Who owns what you build?",
        answer:
          "You do. It's built in code you own, with no per-task fees, and you get a handover guide so you can run it yourself.",
      },
      {
        question: "Will the AI act without asking me?",
        answer:
          "Not for anything that matters. Automations include an approval step, and agents ask you before they send, post or spend anything. Error alerts and spending caps are built in.",
      },
      {
        question: "You build in public. Will you share my project?",
        answer:
          "Not without your permission. Your data and details stay private, and anything that handles personal data gets its own privacy review before work starts.",
      },
      {
        question: "Do you work outside the UK?",
        answer: "Yes. I'm based in Windsor and work remotely with businesses and creators anywhere.",
      },
      {
        question: "What happens after handover?",
        answer:
          "You can run it yourself with the handover guide. For anything I've built, a monthly care plan keeps it healthy with updates, checks and small fixes. It's not an emergency service.",
      },
    ],
  },
  /**
   * The contact section (ADR-0033). No reply-time promise until the enquiry
   * triage automation is live; the call length matches "How it works".
   */
  contact: {
    heading: "Tell me what you want to build",
    supportingCopy:
      "Describe the task or the idea. I'll reply by email, and we can talk it through on a free 30-minute call before I send a written quote.",
    reassurance: "No technical brief needed. A few lines is enough.",
    bookingTitle: "Rather talk first?",
    bookingAction: "Book a free 30-minute call",
    asideCopy:
      "You can send the same details by email. I confirm the scope and price in writing before any work starts.",
  },
  /** The home page's search description; under 160 characters (ADR-0031 D5). */
  seoDescription:
    "Joseph Florendo designs and builds AI agents and automations for businesses and creators, and makes games, all built in public.",
  /** Third-person descriptor used by structured data. */
  personDescription:
    "Joseph Florendo is an AI automation developer in Windsor, UK. He designs and builds AI agents and automations for businesses and creators, and makes games, all in public.",
} as const;
