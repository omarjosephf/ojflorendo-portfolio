export const positioning = {
  professionalName: "OJ Florendo",
  hero: {
    // The name is now carried by the display wordmark below, so the eyebrow
    // states the role only rather than repeating it.
    eyebrow: "WEB DEVELOPER & AI PRODUCT BUILDER",
    /**
     * Display wordmark, rendered above the heading and read as one name.
     *
     * It is deliberately NOT the h1. A visitor deciding whether this person can
     * help them needs the offer first, and the page title, description and
     * structured data all lead with the offer for the same reason. The name
     * carries the visual weight; the offer carries the semantics.
     */
    displayName: ["OJ FLORENDO", "RAYATCHI"],
    // Two sentences, rendered as two lines. The second carries the accent.
    headline: ["Make your services clear.", "Make the next step easy."],
    // Deliberately an offer, not a claim of existing clients: "websites for
    // small service businesses" describes who the work is for. Wording that
    // implies a client roster would breach the handbook's content rules.
    supportingCopy:
      "Websites for small service businesses — clear content, usable layouts and a straightforward way to get in touch.",
    primaryCta: "Discuss your website",
    secondaryCta: "See my work",
    availability:
      "Open to selected website projects and AI document-assistant work. Scope and timing agreed individually.",
    locationNote: "Windsor, Berkshire · Available remotely",
  },
  howIWork: {
    intro:
      "I want to build products that help people understand information, complete a task or run part of their work more easily. In practice that means agreeing a manageable scope, reviewing the work as it develops and checking the important details before handover.",
    principle:
      "You work directly with me. I remain responsible for the decisions and the delivered work.",
    steps: [
      {
        title: "Understand the job",
        description:
          "We clarify who the site is for, what they need to know and what they should be able to do. I will ask about your existing content, constraints and priorities.",
      },
      {
        title: "Agree the scope",
        description:
          "I set out the pages or features, what each of us needs to provide, the review points and how we will judge the work. Timing and price follow from that scope.",
      },
      {
        title: "Build and review",
        description:
          "I turn the agreed direction into a working version, share progress and use your feedback to resolve the details.",
      },
      {
        title: "Check and hand over",
        description:
          "I test the agreed journeys, review mobile and keyboard use, and explain how to maintain the result. Any remaining limitations are made clear.",
      },
    ],
  },
  services: {
    intro:
      "Whether you need a new website or your current one no longer explains your business well, we can start with the pages and enquiry journey that matter most. I review each project before agreeing the scope, timing and cost.",
    /**
     * Three offers, each carrying its own honest status label.
     *
     * The status is part of the offer rather than a separate "experimental"
     * block, because a visitor deciding whether to enquire needs to see the
     * maturity of the specific thing they are considering.
     */
    offers: [
      {
        title: "A focused website or landing page",
        status: "Available now",
        description:
          "For a service business that needs to explain its offer clearly and give prospective customers an obvious next step. I can help organise your content, design the pages and build a responsive site around that journey.",
        includes: [
          "Page structure and content priorities",
          "Responsive design and front-end development",
          "A clear contact or enquiry route",
          "Keyboard, readability and mobile checks",
          "Page titles, descriptions and technical search foundations",
          "Agreed handover notes",
        ],
      },
      {
        title: "Improvements to an existing website",
        status: "Available now, subject to a technical review",
        description:
          "For a site that broadly does its job but has a specific problem: confusing navigation, difficult mobile layouts or a page that makes the service hard to understand. We identify the issue and agree a focused set of changes.",
        includes: [
          "Review of the relevant pages and user journey",
          "Content structure and interface improvements",
          "Responsive layout and accessibility fixes",
          "Verification of the agreed changes",
        ],
      },
      {
        /**
         * Stated as a capability rather than an experiment, because two of these
         * have been built and deployed: Cited, with a committed evaluation set,
         * and E.V on this site. "Available now" is one of the three status
         * labels the handbook permits and is the accurate one here.
         *
         * The management view is described as built and working rather than as a
         * shipped product: its storage is still staging, and overstating that is
         * exactly the kind of claim this project does not make.
         */
        title: "An AI document assistant for your business",
        status: "Available now",
        description:
          "Answers questions about your own documents and shows the sources behind each answer, so the people relying on it can check the work. I have built and deployed this twice — Cited, measured against a committed evaluation set, and E.V on this site — so this is a capability I offer rather than an idea I am exploring.",
        includes: [
          "Retrieval grounded in your approved documents",
          "Every quoted passage verified against its source",
          "Questions the documents cannot answer are refused, not guessed",
          "Cost controls, rate limiting and an evaluation set that measures answers",
          "A management view over questions, answers and knowledge gaps",
          "Agreed scope, stated limitations and handover notes",
        ],
      },
    ],
    scopeNote:
      "Each assistant is built around a defined set of documents and a defined job, and I say plainly what it does not cover. Extending one beyond that scope needs its own privacy review, running costs and support arrangements, agreed before the work starts.",
    // Verified background that is genuinely available, kept visible without
    // presenting four unrelated service lines above the website offer.
    relatedWork:
      "I also have experience delivering AI, Python and data training, and working on digital content and e-commerce operations. Ask about a specific requirement and I'll confirm whether it fits.",
  },
  contact: {
    heading: "Tell me what your website needs to do.",
    supportingCopy:
      "Share a little about your business, who the site is for and what is getting in the way. If you have an existing website, include the link. A rough timeline and budget range are helpful if you know them.",
    reassurance:
      "You do not need a technical brief. I'll review the details and let you know whether I can help and what the next step could be.",
    secondary:
      "Have an AI document assistant or another scoped project in mind? Describe the task and what a useful result would look like.",
    asideCopy:
      "You can send the same details directly. Scope, price and timing are agreed with me after I understand the work.",
  },
  seoDescription:
    "Websites for small service businesses, built by OJ Florendo Rayatchi. Explore his work and discuss a website or an AI document assistant.",
  /** Third-person descriptor used by structured data. */
  personDescription:
    "OJ Florendo Rayatchi is a software developer based in Windsor, Berkshire, building websites and AI document assistants.",
} as const;
