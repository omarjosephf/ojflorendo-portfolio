import { blogAdminCheckedOn, blogAdminNever, blogAdminRoadmap, blogGuardrails, blogHardGates, blogStages, blogStatus } from "@/lib/management/blog-admin";
import { Tag } from "./shared";
import styles from "./management.module.css";
import live from "./live-owner.module.css";

const checked = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(blogAdminCheckedOn));

/** Phase 19a Blog section: read-only by design (ADR-0025). */
export function BlogAdminOverview() {
  return <div className={live.sectionStack}>
    <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-status">
      <div className={live.panelHeading}><h2 id="blog-status">Status</h2><Tag tone="amber">{blogStatus.running ? "Running" : "Not running"}</Tag></div>
      <p><strong>{blogStatus.summary}</strong></p>
      <ul>{blogStatus.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
      <p className={live.muted}>Checked {checked}. This section is read-only: it starts nothing and records nothing.</p>
    </section>
    <section className={`${styles.card} ${live.panel}`} aria-labelledby="blog-pipeline">
      <h2 id="blog-pipeline">Pipeline</h2>
      <p>Agents propose; OJ decides. Planned stages are part of the approved design but not built.</p>
      <ol className={live.stages}>{blogStages.map((stage) => <li key={stage.name}>
        <div><strong>{stage.name}</strong><span className={live.stageTags}><Tag>{stage.kind}</Tag><Tag tone={stage.state === "designed" ? "green" : "neutral"}>{stage.state === "designed" ? "Designed" : "Planned"}</Tag></span></div>
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
