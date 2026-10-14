export const positioning = {
  professionalName: "Joseph Florendo",
  hero: {
    // The role and place, shown above the name.
    role: "AI Automation Developer in Windsor, UK",
    /** Display wordmark: the name, set large. */
    displayName: ["Joseph", "Florendo"],
    // The offer in one sentence, split over two lines.
    headline: [
      "I build AI automations that take repetitive work off small businesses,",
      "and I show you how they work.",
    ],
    supportingCopy:
      "Automation and workflow builds, AI agents and assistants, and automation audits. Every build is tested on real cases before it runs.",
    primaryCta: "Automate a task",
    secondaryCta: "See my work",
    availability:
      "Taking on automation builds, AI assistants and automation audits now. Scope and timing agreed individually.",
    locationNote: "Windsor, Berkshire · Working remotely",
  },
  /**
   * A real three-step sequence, so the numbers carry meaning. Wording describes
   * how the work is done, not results for past clients.
   */
  howIWork: {
    intro:
      "Three steps, from the task you repeat to an automation you can trust.",
    principle:
      "You work directly with me. I remain responsible for what I build and hand over.",
    steps: [
      {
        title: "Tell me the task you repeat",
        description:
          "The emails, the copy-paste, the report you rebuild every Monday. Describe the job in your own words; no technical brief needed.",
      },
      {
        title: "I build it and test it on real cases",
        description:
          "I build the automation around the tools you already use, then run it on real examples from your work before anything goes live.",
      },
      {
        title: "It runs, and you approve what matters",
        description:
          "Routine steps run on their own. Anything that needs judgement comes to you to approve, and you get notes on how it all works.",
      },
    ],
  },
  services: {
    intro:
      "Start with the task you repeat most. I review each request before agreeing scope, timing and cost.",
    /**
     * Four offers in the owner's order (ADR-0029 D3), each with a §6.2 label.
     * The owner chose "Available now" for automation builds on 13 October 2026.
     * Copy states what is offered and what has been built, never client results.
     */
    offers: [
      {
        title: "Automation and workflow builds",
        status: "Available now",
        description:
          "I map the task you repeat, connect the tools you already use, add AI where it earns its place, and hand it over with notes on how it works.",
        includes: [
          "A map of the task and the tools involved",
          "Connections between the tools you already use",
          "AI steps only where they help",
          "Testing on real examples before it goes live",
          "An approval step for anything that matters",
          "Handover notes",
        ],
      },
      {
        /**
         * Evidence named in the copy is what has been built and deployed: Cited
         * and E.V answer from documents, and the blog's agents research, write
         * and review posts that the owner approves before anything publishes.
         */
        title: "AI agents and assistants",
        status: "Available now",
        description:
          "Assistants that answer from your own documents and show the source behind each answer, and agents that handle multi-step jobs with checks built in. I have built and run both: Cited and E.V answer from documents, and a team of agents drafts the posts on my blog for me to approve.",
        includes: [
          "Answers grounded in your approved documents",
          "The source shown with every answer",
          "Questions the documents cannot answer are refused, not guessed",
          "Multi-step agents with a human approval step",
          "Spending limits and rate limits",
          "A test set that measures the answers",
        ],
      },
      {
        title: "Automation audit",
        status: "Available now",
        description:
          "A focused look at your week: which tasks are worth automating, what each would take to build, and what it would cost to run. A good first step if you're not sure where to start.",
        includes: [
          "A walk-through of the tasks you repeat",
          "Which are worth automating, and which are not",
          "Estimated build effort and running costs",
          "A short written plan you keep",
        ],
      },
      {
        title: "Websites",
        status: "Available now",
        description:
          "I also build clear, fast websites for service businesses.",
        includes: [],
      },
    ],
    scopeNote:
      "Every build starts with a defined task and a defined set of tools, and I say plainly what it does not cover. Anything that handles personal or sensitive data gets its own privacy review, running costs and support arrangements, agreed before the work starts.",
    relatedWork:
      "I also co-deliver AI, Python and data training, and I have worked in digital content and e-commerce operations.",
  },
  /**
   * The hero's example run. Synthetic by design and labelled as such on the
   * page: it shows how a typical automation behaves, not a client project.
   */
  exampleRun: {
    title: "An example automation",
    caption: "An illustration of a typical flow, not a client project.",
    steps: [
      { title: "A new enquiry arrives", detail: "A customer emails to ask about availability next week." },
      { title: "AI reads and sorts it", detail: "Marked as a booking request, with the dates and contact details pulled out." },
      { title: "A reply is drafted", detail: "Written in your tone, with the details already filled in." },
      { title: "You approve it", detail: "One click sends it, files the request and logs what happened." },
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
      summary: "[LEARN YOUR WAY: ONE-LINE DESCRIPTION]",
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
    // Placeholder until the owner writes the short version of his story.
    body: "[YOUR STORY: SHORT VERSION]",
    link: "Read the full story",
  },
  contact: {
    heading: "What do you repeat every week?",
    supportingCopy:
      "Tell me the task: what starts it, which tools are involved and what a finished job looks like. I'll tell you whether it can run on its own and what it would take.",
    reassurance:
      "You don't need a technical brief. A rough description is enough to start.",
    secondary:
      "Thinking about an AI assistant, an agent or a website instead? Describe the job and what a useful result would look like.",
    asideCopy:
      "You can send the same details by email. Scope, price and timing are agreed with me once I understand the work.",
  },
  seoDescription:
    "Joseph Florendo is an AI automation developer in Windsor, UK. He builds AI automations, agents and assistants that take repetitive work off small businesses.",
  /** Third-person descriptor used by structured data. */
  personDescription:
    "Joseph Florendo is an AI automation developer based in Windsor, Berkshire, building AI automations, agents and assistants for small businesses.",
} as const;
