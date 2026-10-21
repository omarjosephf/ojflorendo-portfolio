import { site } from "./site";

/**
 * The privacy notice (roadmap row JF-2). Every statement describes what the
 * code does today, so a change to a data flow must change this file too:
 * - the enquiry form: `src/app/api/contact/route.ts` and `src/lib/email`
 *   (emailed through Resend, never stored; ADR-0001, ADR-0033);
 * - spam protection: the in-memory limiter and the optional Turnstile check
 *   (ADR-0005);
 * - E.V: `src/app/api/assistant/route.ts`, Google's paid API tier with OpenAI
 *   as the fallback (ADR-0014, ADR-0020), and the tab-only chat memory;
 * - the theme cookie: `src/components/theme/ThemeProvider.tsx`.
 * The call-booking section appears only once `site.bookingUrl` is set.
 * Wording awaits the owner's approval before launch.
 */
export type PrivacySection = {
  id: string;
  heading: string;
  paragraphs: readonly string[];
};

export const privacyUpdated = "21 October 2026";

export const privacyIntro =
  "This notice explains what this website collects about you, why, who else handles it and what you can ask me to do. I keep it short and I collect as little as I can.";

const booking: readonly PrivacySection[] = site.bookingUrl
  ? [
      {
        id: "booking",
        heading: "Booking a call",
        paragraphs: [
          "If you book a call, Cal.com handles the booking and holds the details you give it in the United States, under the EU–US Data Privacy Framework. I use them only to hold the call.",
        ],
      },
    ]
  : [];

export const privacySections: readonly PrivacySection[] = [
  {
    id: "who",
    heading: "Who I am",
    paragraphs: [
      `This site is run by Joseph Florendo, an AI automation developer in Windsor, UK. I decide how the personal data described here is used. For anything about your data, email ${site.email}.`,
    ],
  },
  {
    id: "enquiries",
    heading: "The enquiry form",
    paragraphs: [
      "The form asks for your name, email address, what you need and a short message, and for your agreement that I can reply. Everything else is optional: your role, company, company website, company size, the areas you want to improve and a budget range.",
      "I use these details only to reply to your enquiry and, if we go ahead, to prepare a quote. You ask me to reply, and you tick the box to agree, so my legal basis is taking the steps you ask for before a possible contract.",
      "The form emails your enquiry to my inbox through Resend, an email delivery service. It isn't saved in a database on this site, and its contents are never written to the site's logs. I keep enquiries for up to 12 months after we last spoke, then delete them, unless we work together and the project needs its records.",
    ],
  },
  {
    id: "spam",
    heading: "Spam protection",
    paragraphs: [
      "To stop automated spam, the site counts how many messages come from each network address in a minute. The count is held briefly in memory and never saved.",
      "When the form shows an anti-spam check, Cloudflare Turnstile confirms that a person is sending it. Cloudflare receives technical details such as your network address to do this.",
    ],
  },
  ...booking,
  {
    id: "ev",
    heading: "E.V, the assistant",
    paragraphs: [
      "Questions you type into E.V go through my server to Google's Gemini API, with OpenAI as a backup when Google is unavailable. Google handles them under its paid API terms, which say paid-tier data isn't used to improve its products. Each provider may keep requests for a limited time under its own policy.",
      "E.V's logs record only whether a request worked and how long it took, never your question. Your browser keeps up to 20 recent exchanges in that tab so the chat survives a refresh, and Clear chat removes them. Saved chats are switched off on this site; if that changes, this notice will describe them first. Please don't type personal or sensitive information into E.V.",
    ],
  },
  {
    id: "cookies",
    heading: "Cookies and analytics",
    paragraphs: [
      "The site may set one cookie, which remembers your colour theme. It holds no identifier. There are no advertising or tracking cookies, and no analytics.",
    ],
  },
  {
    id: "hosting",
    heading: "Hosting",
    paragraphs: [
      "Vercel hosts this site, and E.V's server runs on Fly.io. Like any web host, they process your network address and browser details to deliver pages and keep them secure.",
    ],
  },
  {
    id: "rights",
    heading: "Your rights",
    paragraphs: [
      `You can ask for a copy of your data, ask me to correct or delete it, or object to how I use it. Email ${site.email} and I'll respond within one month, as UK law requires.`,
      "If you're unhappy with how I've handled your data, you can complain to the Information Commissioner's Office at ico.org.uk.",
    ],
  },
  {
    id: "changes",
    heading: "Changes",
    paragraphs: ["When this notice changes, the date at the top changes with it."],
  },
];
