import {
  blogAdminCheckedOn,
  blogAdminNever,
  blogAdminRoadmap,
  blogAgentModels,
  blogFallbacks,
  blogGuardrails,
  blogHardGates,
  blogRoleLabel,
  blogRuns,
  blogStages,
  blogStatus,
} from "@/lib/management/blog-admin";
import type { PublicRunSummary } from "@/lib/blog/live/publish";
import { Tag } from "./shared";
import styles from "./management.module.css";
import live from "./live-owner.module.css";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const checked = dateFormat.format(new Date(blogAdminCheckedOn));
const usd = (micro: number | null) => (micro === null ? "unknown" : `US$${(micro / 1_000_000).toFixed(4)}`);
const tokens = (value: number | null) => (value === null ? "—" : value.toLocaleString("en-GB"));

const STATUS_LABEL: Record<PublicRunSummary["status"], { text: string; tone: "green" | "amber" | "neutral" }> = {
  "owner-review": { text: "Passed; for OJ's approval", tone: "green" },
  held: { text: "Held", tone: "amber" },
  "no-draft": { text: "No draft", tone: "neutral" },
  failed: { text: "Stopped", tone: "amber" },
};

function runStatus(run: PublicRunSummary) {
  if (run.status === "owner-review") {
    return run.postSlug
      ? { text: "Passed; published", tone: "green" as const }
      : { text: "Passed; not published", tone: "neutral" as const };
  }
  return STATUS_LABEL[run.status];
}

const shortUsd = (micro: number) => `US${(micro / 1_000_000).toFixed(2)}`;

/** One run, collapsed to a summary line unless it produced the published post. */
function RunCard({ run }: { run: PublicRunSummary }) {
  const status = runStatus(run);
  const headingId = `blog-run-${run.runId}`;
  return <details className={`${styles.card} ${live.panel} ${live.runDetails}`} open={Boolean(run.postSlug)}>
    <summary>
      <span className={live.panelHeading}>
        <h3 id={headingId}>{run.title ?? "No draft was produced"}</h3>
        <Tag tone={status.tone}>{status.text}</Tag>
      </span>
      <span className={live.muted}>
        {dateFormat.format(new Date(run.createdAt))} · run {run.runId} · editorial score {run.editorialScore ?? "none"} (passes above 75) · {usd(run.totalCostMicroUsd)}
      </span>
    </summary>
    {run.postSlug && <p>Published as <a href={`/blog/${run.postSlug}`}>/blog/{run.postSlug}</a>.</p>}
    {run.holdReasons.length > 0 && <ul>{run.holdReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
    {run.hardGates.length > 0 && <>
      <h4>Hard gates</h4>
      <ul>{run.hardGates.map((gate) => <li key={gate.id}>{gate.passed ? "Passed" : "Failed"}: {gate.id}</li>)}</ul>
    </>}
    {run.scores && <p>Reviewer scores: groundedness {run.scores.groundedness}, citation quality {run.scores.citationQuality}, writing and voice {run.scores.writingAndVoice}, security {run.scores.securityAndRobustness}. Decisions: {run.reviewDecisions.join(" then ")}.</p>}
    <h4>Calls</h4>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`Model calls for run ${run.runId}`}>
      <table className={styles.table}>
        <thead><tr><th scope="col">Stage</th><th scope="col">Agent</th><th scope="col">Model</th><th scope="col">Outcome</th><th scope="col">Input</th><th scope="col">Output + thinking</th><th scope="col">Cost</th></tr></thead>
        <tbody>{run.calls.map((call, index) => <tr key={`${call.stage}-${index}`}>
          <th scope="row">{call.stage}</th><td>{blogRoleLabel(call.role)}</td><td>{call.model} ({call.thinkingLevel})</td><td>{call.outcome}</td>
          <td>{tokens(call.inputTokens)}</td><td>{tokens(call.outputTokens)} + {tokens(call.thoughtTokens)}</td><td>{usd(call.costMicroUsd)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {run.seo && <>
      <h4>SEO advice (score {run.seo.score})</h4>
      <ul>{run.seo.findings.map((finding, index) => <li key={index}><strong>{finding.area}</strong> ({finding.severity}): {finding.advice}</li>)}</ul>
    </>}
    {run.critique && <>
      <h4>Critique lessons</h4>
      <dl className={live.definitions}>{run.critique.filter((lesson) => lesson.participated).map((lesson) => <div key={lesson.agent}><dt>{blogRoleLabel(lesson.agent)}</dt><dd>{lesson.lesson}</dd></div>)}</dl>
    </>}
  </details>;
}

/** Blog section of the owner panel: read-only (ADR-0025), showing phase 18.4's live agents (ADR-0026). */
export function BlogAdminOverview() {
  return <div className={live.sectionStack}>
    <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-status">
      <div className={live.panelHeading}><h2 id="blog-status">Status</h2><Tag tone="green">{blogStatus.mode}</Tag></div>
      <p><strong>{blogStatus.summary}</strong></p>
      <ul>{blogStatus.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
      <p className={live.muted}>Checked {checked}. This section is read-only: it starts nothing and records nothing.</p>
    </section>
    <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-models">
      <h2 id="blog-models">Agents and models</h2>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Agent models">
        <table className={styles.table}>
          <thead><tr><th scope="col">Agent</th><th scope="col">Model</th><th scope="col">Thinking</th><th scope="col">Output cap</th><th scope="col">Tools</th></tr></thead>
          <tbody>{blogAgentModels.map((agent) => <tr key={agent.role}><th scope="row">{agent.role}</th><td>{agent.model}</td><td>{agent.thinking}</td><td>{agent.outputCap.toLocaleString("en-GB")} tokens</td><td>{agent.tools}</td></tr>)}</tbody>
        </table>
      </div>
      <p className={live.muted}>Fallbacks: {blogFallbacks}</p>
    </section>
    <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-runs">
      <h2 id="blog-runs">Runs</h2>
      {blogRuns.length === 0
        ? <p>No run has been recorded yet.</p>
        : <>
          <dl className={live.metrics}>
            <div><dt>Published posts</dt><dd>{blogRuns.filter((run) => run.postSlug).length}</dd></div>
            <div><dt>Runs recorded</dt><dd>{blogRuns.length}</dd></div>
            <div><dt>Passed every gate</dt><dd>{blogRuns.filter((run) => run.status === "owner-review").length} of {blogRuns.length}</dd></div>
            <div><dt>Model spend</dt><dd>{shortUsd(blogRuns.reduce((sum, run) => sum + run.totalCostMicroUsd, 0))}</dd></div>
          </dl>
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Recorded runs">
            <table className={styles.table}>
              <thead><tr><th scope="col">Date</th><th scope="col">Draft</th><th scope="col">Result</th><th scope="col">Score</th><th scope="col">Cost</th></tr></thead>
              <tbody>{blogRuns.map((run) => <tr key={run.runId}>
                <td>{dateFormat.format(new Date(run.createdAt))}</td>
                <th scope="row" className={live.runTitle}>{run.postSlug ? <a href={`/blog/${run.postSlug}`}>{run.title}</a> : run.title ?? "No draft"}</th>
                <td>{runStatus(run).text}</td><td>{run.editorialScore ?? "—"}</td><td>{shortUsd(run.totalCostMicroUsd)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className={live.muted}>Newest first. Open a run below for its gates, calls, SEO advice and Critique lessons. Private run records, with the full draft and evidence, stay on OJ&apos;s computer. Idea Scout calls are recorded separately and are not included in this spend.</p>
        </>}
    </section>
    {blogRuns.map((run) => <RunCard key={run.runId} run={run} />)}
    <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-pipeline">
      <h2 id="blog-pipeline">Pipeline</h2>
      <p>Agents propose; OJ decides.</p>
      <ol className={live.stages}>{blogStages.map((stage) => <li key={stage.name}>
        <div><strong>{stage.name}</strong><span className={live.stageTags}><Tag>{stage.kind}</Tag><Tag tone={stage.state === "live" ? "green" : "neutral"}>{stage.state === "live" ? "Live" : "Planned"}</Tag></span></div>
        <p>{stage.does}</p>
      </li>)}</ol>
    </section>
    <div className={live.twoPanels}>
      <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-guardrails">
        <h2 id="blog-guardrails">Guardrails</h2>
        <dl className={live.definitions}>{blogGuardrails.map((g) => <div key={g.name}><dt>{g.name}</dt><dd>{g.detail}</dd></div>)}</dl>
      </section>
      <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-gates">
        <h2 id="blog-gates">Reviewer hard gates</h2>
        <p>Any failed gate holds the post, whatever its score.</p>
        <ul>{blogHardGates.map((gate) => <li key={gate}>{gate}</li>)}</ul>
      </section>
    </div>
    <div className={live.twoPanels}>
      <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-next">
        <h2 id="blog-next">Coming to this section</h2>
        <dl className={live.definitions}>{blogAdminRoadmap.map((r) => <div key={r.phase}><dt>Phase {r.phase}</dt><dd>{r.adds}</dd></div>)}</dl>
      </section>
      <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-never">
        <h2 id="blog-never">This panel will never</h2>
        <ul>{blogAdminNever.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  </div>;
}
