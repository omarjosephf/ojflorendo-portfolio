/**
 * Static, read-only description of the blog multi-agent system for the owner
 * admin panel (ADR-0025, phase 19a). It states what exists and what does not;
 * it reads no pipeline code, starts no run and records no decision. Update it
 * by pull request when package 18 changes.
 */
export const blogAdminCheckedOn = "2026-09-28";

export type BlogStageState = "designed" | "planned";
export type BlogStage = { name: string; kind: "AI role" | "Deterministic" | "Owner"; state: BlogStageState; does: string };

export const blogStatus = {
  running: false,
  summary: "No agent has run. The pipeline is not deployed and holds no provider key.",
  facts: [
    "Package 18's code is not on the main branch yet; phase 18.3, the provider comparison, has not run.",
    "Every review bundle so far comes from saved test fixtures with synthetic cost.",
    "Publication is always refused by the pipeline. Only a pull request that the owner approves can publish a post.",
  ],
} as const;

export const blogStages: readonly BlogStage[] = [
  { name: "Idea Scout", kind: "AI role", state: "planned", does: "Suggests three to five evidence-backed topics, or fewer when evidence is weak." },
  { name: "Owner brief", kind: "Owner", state: "designed", does: "OJ chooses or edits the topic, audience and key message. Only a chosen brief can start a run." },
  { name: "Planner–Researcher", kind: "AI role", state: "designed", does: "Builds the evidence ledger from approved sources: excerpts, claims and an outline." },
  { name: "Writer", kind: "AI role", state: "designed", does: "Drafts the post from the ledger only, citing the evidence for each claim." },
  { name: "SEO review", kind: "AI role", state: "planned", does: "Checks usefulness and discoverability; cannot add facts or approve publication." },
  { name: "Reviewer–Verifier", kind: "AI role", state: "designed", does: "Checks every claim independently and applies the hard gates." },
  { name: "Deterministic checks", kind: "Deterministic", state: "designed", does: "Schema, citation, budget and integrity checks; the same result every time." },
  { name: "Owner decision", kind: "Owner", state: "designed", does: "Approve a content-only pull request, ask for one revision, or reject." },
  { name: "Critique", kind: "AI role", state: "planned", does: "Writes a lesson for each agent after every attempt, for OJ to accept or decline." },
];

export const blogHardGates = [
  "Claim coverage", "Claim support", "Citation integrity", "Contradiction handling", "Prompt injection", "Privacy", "Safe content",
] as const;

export const blogGuardrails = [
  { name: "Human approval gate", detail: "No post is published without OJ's approval, and merging still needs the approved-to-deploy label." },
  { name: "Caps and budget", detail: "At most five model calls per run and a cost ceiling per run, reserved before each call." },
  { name: "Full logging", detail: "Each call records its role, model, reservation, actual cost and outcome, with digests of the prompts and outputs." },
  { name: "Sandbox first", detail: "The pipeline has only ever run against saved fixtures. A live run needs a separate owner approval." },
] as const;

export const blogAdminRoadmap = [
  { phase: "19b", adds: "Record owner decisions (brief choice, approve, revise, reject, lesson review), each tied to the review bundle's digest; an audit log; a pause switch." },
  { phase: "19c", adds: "Show real runs and review bundles once phase 18.3 has run." },
] as const;

export const blogAdminNever = [
  "Publish, merge or deploy",
  "Hold a provider key in the browser",
  "Edit prompts or rubrics in place",
  "Treat the Reviewer's verdict as the owner's",
  "Start an unbounded run",
] as const;
