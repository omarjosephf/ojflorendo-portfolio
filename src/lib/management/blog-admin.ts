import { LIVE_AGENTS, LIVE_PHASE_CEILING_MICRO_USD, LIVE_RUN_CEILING_MICRO_USD, type LiveAgentRole } from "@/lib/blog/live/catalog";
import type { PublicRunSummary } from "@/lib/blog/live/publish";
import runSummaries from "@/data/blog-runs.json";

/**
 * Read-only description of the blog multi-agent system for the owner admin
 * panel (ADR-0025 panel, ADR-0026 models, phase 18.4). It reads committed run
 * summaries only; it starts no run and records no decision. Update it by pull
 * request when package 18 changes.
 */
export const blogAdminCheckedOn = "2026-09-30";

export type BlogStageState = "live" | "planned";
export type BlogStage = { name: string; kind: "AI role" | "Deterministic" | "Owner"; state: BlogStageState; does: string };

export const blogRuns = runSummaries as unknown as readonly PublicRunSummary[];

export const blogStatus = {
  running: false,
  mode: "Owner-run",
  summary: "The six agents run on Gemini from OJ's own computer, one run at a time. Every post waits for OJ's approval: auto-publish is off.",
  facts: [
    "Runs start only when OJ starts them; nothing is scheduled.",
    `Each run is capped at US$${(LIVE_RUN_CEILING_MICRO_USD / 1_000_000).toFixed(2)} and at seven model calls, reserved before each call; phase 18.4 as a whole is capped at US$${(LIVE_PHASE_CEILING_MICRO_USD / 1_000_000).toFixed(2)}.`,
    "Drafting agents quote only exact sentences from OJ's own public material; Idea Scout alone searches the web, to suggest topics.",
    "A post reaches the site only through a pull request that OJ approves and merges.",
  ],
} as const;

export const blogStages: readonly BlogStage[] = [
  { name: "Idea Scout", kind: "AI role", state: "live", does: "Suggests up to five topics OJ can write from his own material, using Google Search to judge what readers care about." },
  { name: "Owner brief", kind: "Owner", state: "live", does: "OJ picks an idea. Only a chosen idea can start a run; an unchosen idea is never written up." },
  { name: "Planner–Researcher", kind: "AI role", state: "live", does: "Chooses exact supporting sentences from the allowlisted sources and outlines the post." },
  { name: "Writer", kind: "AI role", state: "live", does: "Drafts the post around those sentences, quoting each one word for word where it is cited." },
  { name: "SEO review", kind: "AI role", state: "live", does: "Advises on search intent, title, description and structure; it cannot change facts or approve." },
  { name: "Reviewer–Verifier", kind: "AI role", state: "live", does: "A different model checks every citation and applies the hard gates; one revision at most." },
  { name: "Deterministic checks", kind: "Deterministic", state: "live", does: "Schema, exact-quote, citation, privacy, budget and integrity checks; the same result every time." },
  { name: "Owner decision", kind: "Owner", state: "live", does: "OJ reads the draft and approves a content-only pull request, or leaves the post unpublished." },
  { name: "Critique", kind: "AI role", state: "live", does: "Gives each agent that ran one evidence-backed lesson after every attempt, for OJ to review." },
];

const ROLE_LABELS: Record<LiveAgentRole, string> = {
  "idea-scout": "Idea Scout",
  "planner-researcher": "Planner–Researcher",
  writer: "Writer",
  seo: "SEO",
  "reviewer-verifier": "Reviewer–Verifier",
  critique: "Critique",
};

export function blogRoleLabel(role: string) {
  return ROLE_LABELS[role as LiveAgentRole] ?? role;
}

export const blogAgentModels = (Object.keys(LIVE_AGENTS) as LiveAgentRole[]).map((role) => ({
  role: ROLE_LABELS[role],
  model: LIVE_AGENTS[role].model,
  thinking: LIVE_AGENTS[role].thinkingLevel,
  outputCap: LIVE_AGENTS[role].maxOutputTokens,
  tools: LIVE_AGENTS[role].googleSearch ? "Google Search" : "None",
}));

export const blogFallbacks = "OpenAI, then Anthropic, per ADR-0026. Not built yet: a fallback is used only after it passes the same test posts.";

export const blogHardGates = [
  "Claim coverage", "Claim support", "Citation integrity", "Contradiction handling", "Prompt injection", "Privacy", "Safe content",
] as const;

export const blogGuardrails = [
  { name: "Human approval gate", detail: "No post is published without OJ's approval, and merging still needs the approved-to-deploy label." },
  { name: "Caps and budget", detail: "Seven model calls and US$1.00 per run, each call's worst case reserved in a durable ledger before it is sent. No retries." },
  { name: "Editorial pass mark", detail: "A post is offered for approval only when every gate passes and the editorial score is above 75; exactly 75 is held." },
  { name: "Full logging", detail: "Each call records its role, model, thinking level, tokens, cost and outcome, with digests of the request and instruction." },
] as const;

export const blogAdminRoadmap = [
  { phase: "19b", adds: "Choose ideas, start runs and record decisions from this panel, each tied to the run record's digest; an audit log; a pause switch." },
  { phase: "18.5", adds: "A pick-ahead idea queue, a schedule, and auto-publish once the Reviewer's decisions match OJ's own." },
] as const;

export const blogAdminNever = [
  "Publish, merge or deploy",
  "Hold a provider key in the browser",
  "Edit prompts or rubrics in place",
  "Treat the Reviewer's verdict as the owner's",
  "Start an unbounded run",
] as const;
