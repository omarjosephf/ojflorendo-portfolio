import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/data/blog-runs.json", () => ({
  default: [
    {
      kind: "blog-run-summary",
      runId: "run-20260930-080000",
      createdAt: "2026-09-30T08:00:00.000Z",
      title: "Inside a grounded portfolio assistant",
      status: "owner-review",
      holdReasons: [],
      postSlug: "inside-a-grounded-assistant",
      editorialScore: 84,
      hardGates: [{ id: "claim-support", passed: true }],
      scores: { groundedness: 90, citationQuality: 85, writingAndVoice: 80, securityAndRobustness: 82 },
      reviewDecisions: ["approve"],
      seo: { score: 70, findings: [{ area: "title", severity: "low", advice: "Lead with the reader's question." }] },
      critique: [
        { agent: "writer", participated: true, lesson: "Open with the problem, not the tool." },
        { agent: "idea-scout", participated: false, lesson: "Did not run in this attempt." },
      ],
      calls: [
        { role: "writer", stage: "draft", model: "gemini-3.8-flash", thinkingLevel: "medium", outcome: "accepted", inputTokens: 9000, outputTokens: 2000, thoughtTokens: 1500, costMicroUsd: 19875, latencyMs: 30000 },
      ],
      totalCostMicroUsd: 19875,
      recordSha256: "a".repeat(64),
    },
  ],
}));

const { BlogAdminOverview } = await import("./BlogAdminOverview");

it("shows each agent's model and a recorded run with its gates, calls, SEO advice and lessons", () => {
  render(<BlogAdminOverview />);
  expect(screen.getByText("Owner-run")).toBeInTheDocument();
  const models = screen.getByRole("region", { name: "Agent models" });
  expect(within(models).getByRole("rowheader", { name: "Reviewer–Verifier" }).closest("tr")).toHaveTextContent("gemini-3.1-pro-preview");
  expect(within(models).getByRole("rowheader", { name: "Idea Scout" }).closest("tr")).toHaveTextContent("Google Search");
  expect(screen.getByRole("region", { name: "Recorded runs" })).toHaveTextContent("Passed; published");
  const run = screen.getByRole("heading", { level: 3, name: "Inside a grounded portfolio assistant" }).closest("details") as HTMLElement;
  expect(run).toHaveAttribute("open");
  expect(within(run).getByText("Passed; published")).toBeInTheDocument();
  expect(within(run).getByRole("link", { name: "/blog/inside-a-grounded-assistant" })).toHaveAttribute("href", "/blog/inside-a-grounded-assistant");
  expect(within(run).getByText(/Lead with the reader's question/)).toBeInTheDocument();
  expect(within(run).getByText("Open with the problem, not the tool.")).toBeInTheDocument();
  expect(within(run).queryByText("Did not run in this attempt.")).not.toBeInTheDocument();
  expect(within(run).getByRole("region", { name: "Model calls for run run-20260930-080000" })).toHaveTextContent("US$0.0199");
});
