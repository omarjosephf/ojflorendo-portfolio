import { useState } from "react";
import { Activity, ArrowRight, BookOpen, CheckCircle2, ChevronRight, MessageSquare, Search, Sparkles } from "lucide-react";
import { outcomeLabels, type QuestionGroup } from "@/lib/management/analytics";
import type { Conversation, CorpusSnapshot } from "@/lib/management/types";
import type { Report } from "./ManagementWorkspace";
import { Metric, Percent, shortSource, Tag, time } from "./shared";
import styles from "./management.module.css";

function ChatList({ items, selected, choose }: { items: Conversation[]; selected?: string; choose: (id: string) => void }) {
  return <div className={styles.chatList}>{items.length ? items.map((c) => <button type="button" key={c.id} className={`${styles.chatRow} ${selected === c.id ? styles.selected : ""}`} onClick={() => choose(c.id)} aria-pressed={selected ? selected === c.id : undefined}>
    <span className={styles.avatar}><MessageSquare size={15} aria-hidden="true" /></span><span className={styles.chatCopy}><strong>{c.turns[0].question}</strong><span>{c.guest} · {time(c.turns.at(-1)!.at)} UTC</span></span>
    <span className={styles.rowEnd}>{c.turns.some((t) => t.outcome !== "answered") ? <Tag tone="amber">Review</Tag> : <Tag tone="green">Answered</Tag>}<ChevronRight size={16} aria-hidden="true" /></span>
  </button>) : <p className={styles.empty}>No conversations match these filters.</p>}</div>;
}

export function Overview({ report, days, openChat, openGap, openSource, showConversations, showQuestions }: {
  report: Report; days: number; openChat: (id: string) => void; openGap: (g: QuestionGroup) => void;
  openSource: (s: string) => void; showConversations: () => void; showQuestions: () => void;
}) {
  return <>
    <div className={styles.metrics}>
      <Metric label="Conversations" value={report.sessions} note={`${report.guests} distinct sample guests`} icon={<MessageSquare size={18} />} />
      <Metric label="Grounded answers" value={<Percent value={report.answered} total={report.turns.length} />} note={`${report.answered} of ${report.turns.length} questions answered`} icon={<CheckCircle2 size={18} />} />
      <Metric label="Questions to review" value={report.gaps.length} note="Distinct unanswered question groups" icon={<Sparkles size={18} />} />
      <Metric label="Helpful feedback" value={<Percent value={report.helpful} total={report.feedback.length} />} note={`${report.helpful} helpful / ${report.feedback.length} rated answers`} icon={<Activity size={18} />} />
    </div>
    <div className={styles.overviewGrid}>
      <section className={styles.card}><div className={styles.cardHeading}><div><h2>Conversation activity</h2><p>Questions and grounded answers by day</p></div><Tag>UTC</Tag></div>
        <div className={styles.chartLegend}><span><i /> Answered</span><span><i /> Needs review</span></div>
        <div className={styles.chart} role="img" aria-label={`${report.turns.length} questions over ${days} days, ${report.answered} answered. Daily counts follow in the accessible table.`}>
          {report.daily.map((d, i) => <div key={d.date} className={styles.chartColumn}><span className={styles.chartNumber}>{d.total || ""}</span><div className={styles.chartTrack}>{Array.from({ length: Math.max(5, ...report.daily.map((x) => x.total)) }, (_, row) => <i key={row} className={row < d.answered ? styles.chartAnswered : row < d.total ? styles.chartGap : styles.chartBlank} />)}</div><span className={styles.chartDate}>{days === 7 || i % 5 === 0 ? d.date.slice(8) : ""}</span></div>)}
        </div><table className={styles.srOnly}><caption>Daily question activity, UTC</caption><thead><tr><th>Date</th><th>Questions</th><th>Answered</th></tr></thead><tbody>{report.daily.map((d) => <tr key={d.date}><th>{d.date}</th><td>{d.total}</td><td>{d.answered}</td></tr>)}</tbody></table>
        <div className={styles.cardFoot}><span>{report.daily[0]?.date} – 8 Sep 2026</span><span>{report.fallback} backup-route turns</span></div>
      </section>
      <section className={`${styles.card} ${styles.attentionCard}`}><div className={styles.cardHeading}><div><span className={styles.sectionIcon}><Sparkles size={20} aria-hidden="true" /></span><h2>The next better answer</h2><p>Start with a question people repeated.</p></div></div>
        {report.gaps.slice(0, 2).map((item) => <button key={item.key} className={styles.gapSuggestion} onClick={() => openGap(item)}><Tag tone="amber">{item.count} questions · {item.sessions} conversations</Tag><strong>{item.question}</strong><span>{outcomeLabels[item.outcomes[0]]} <ArrowRight size={17} aria-hidden="true" /></span></button>)}
        <button className={styles.textButton} onClick={showQuestions}>Review all question gaps <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
    </div>
    <div className={styles.overviewGrid}>
      <section className={styles.card}><div className={styles.cardHeading}><div><h2>Recent conversations</h2><p>A closer look at the latest exchanges</p></div><button className={styles.textButton} onClick={showConversations}>View all <ArrowRight size={15} aria-hidden="true" /></button></div><ChatList items={report.selected.slice(0, 4)} choose={openChat} /></section>
      <section className={styles.card}><div className={styles.cardHeading}><div><h2>Sources showing up</h2><p>Citation exposure across {report.turns.length} questions</p></div></div><div className={styles.sourceRanking}>{report.sourceSignals.slice(0, 4).map((s, index) => <button key={s.source} onClick={() => openSource(s.source)}><span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span><span><strong>{shortSource(s.source)}</strong><small>{s.retrieved} retrieved · {s.cited} cited</small></span><ChevronRight size={15} aria-hidden="true" /></button>)}</div><p className={styles.cardNote}>Low exposure does not mean low interest. Click tracking is not enabled.</p></section>
    </div>
  </>;
}

export function Conversations({ report, corpus, selectedChat, setSelectedChat, openSource }: {
  report: Report; corpus: CorpusSnapshot; selectedChat: string | null; setSelectedChat: (id: string) => void; openSource: (s: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const matchingChats = report.selected.filter((c) => (filter === "all" || c.turns.some((t) => filter === "attention" ? t.outcome !== "answered" : t.route === "fallback")) &&
    `${c.guest} ${c.id} ${c.turns.map((t) => t.question + " " + t.answer).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const chat = matchingChats.find((c) => c.id === selectedChat) ?? matchingChats[0];
  return <section className={styles.card}>
    <div className={styles.inboxControls}><label className={styles.search}><Search size={17} aria-hidden="true" /><input aria-label="Search conversations" placeholder="Search questions, replies or guest…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Conversation outcome" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All conversations</option><option value="attention">Needs review</option><option value="fallback">Backup used</option></select><span>{matchingChats.length} results</span></div>
    <div className={styles.inbox}><div className={styles.inboxList}><ChatList items={matchingChats} selected={chat?.id} choose={setSelectedChat} /></div><div className={styles.transcript}>
      {chat ? <><div className={styles.transcriptHeading}><div><h2>{chat.guest}</h2><p>{chat.id} · Synthetic conversation</p></div><Tag>{chat.turns.length} {chat.turns.length === 1 ? "question" : "questions"}</Tag></div>
        {chat.turns.map((turn) => <article key={turn.id} className={styles.exchange}><div className={styles.userMessage}><span>VISITOR · {time(turn.at)} UTC</span><p>{turn.question}</p></div><div className={styles.assistantMessage}><span><span className={styles.miniMark}>e.v</span> E.V ASSISTANT <Tag tone={turn.outcome === "answered" ? "green" : "amber"}>{outcomeLabels[turn.outcome]}</Tag></span><p>{turn.answer}</p>{turn.cited.length > 0 && <div className={styles.citations}>{turn.cited.map((s) => <button key={s} onClick={() => openSource(s)}><BookOpen size={13} aria-hidden="true" />{shortSource(s)}</button>)}</div>}<dl className={styles.trace}><div><dt>Route</dt><dd>{turn.route === "none" ? "No answer" : turn.route === "fallback" ? "Backup" : "Primary"}</dd></div><div><dt>Latency</dt><dd>{turn.latencyMs === null ? "Unavailable" : (turn.latencyMs / 1000).toFixed(2) + "s"}</dd></div><div><dt>Feedback</dt><dd>{turn.feedback ?? "Not rated"}</dd></div></dl><details className={styles.traceDetails}><summary>Inspect retrieval trace</summary><p>Sample event: {turn.id}</p><p>Corpus snapshot: {corpus.corpusSha256.slice(0, 12)}</p><p>Retrieved: {turn.retrieved.join(", ") || "No source attached"}</p><p>This synthetic event does not indicate a live provider call.</p></details></div></article>)}
      </> : <p className={styles.empty}>No conversation matches these filters.</p>}
    </div></div>
  </section>;
}
