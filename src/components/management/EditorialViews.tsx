import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronRight, FileText, Plus, Sparkles, TriangleAlert, X } from "lucide-react";
import { outcomeLabels, type QuestionGroup } from "@/lib/management/analytics";
import type { Draft, GapStatus, WorkspaceState } from "@/lib/management/types";
import type { Report, SaveMutation } from "./ManagementWorkspace";
import { Tag, time } from "./shared";
import styles from "./management.module.css";

export function Questions({ report, store, gap, openGap, closeGap, gapNote, setGapNote, gapStatus, setGapStatus, saving, save, openChat, prepareDraft }: {
  report: Report; store: WorkspaceState | null; gap: QuestionGroup | null; openGap: (g: QuestionGroup) => void; closeGap: () => void;
  gapNote: string; setGapNote: (note: string) => void; gapStatus: GapStatus; setGapStatus: (s: GapStatus) => void;
  saving: boolean; save: (m: SaveMutation) => Promise<boolean>; openChat: (id: string) => void; prepareDraft: (g: QuestionGroup) => void;
}) {
  return <>
    <div className={styles.twoColumns}><section className={styles.card}><div className={styles.cardHeading}><div><h2>Most asked questions</h2><p>Normalized wording · repeated turns are counted</p></div></div><div className={styles.questionRanking}>{report.questions.slice(0, 8).map((item, index) => <button key={item.key} onClick={() => openChat(item.conversationIds[0])}><span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span><span><strong>{item.question}</strong><small>{item.sessions} conversations</small></span><b>{item.count}</b></button>)}</div></section>
    <section className={styles.card}><div className={styles.cardHeading}><div><h2>Review queue</h2><p>Diagnose the reason before adding more content.</p></div><Tag tone="amber">{report.gaps.length} groups</Tag></div>{report.gaps.map((item) => <button key={item.key} className={`${styles.queueRow} ${gap?.key === item.key ? styles.selected : ""}`} onClick={() => openGap(item)}><span><strong>{item.question}</strong><small>{outcomeLabels[item.outcomes[0]]} · {item.count} questions</small></span><Tag>{store?.triage[item.key]?.status.replaceAll("_", " ") ?? "new"}</Tag><ChevronRight size={15} aria-hidden="true" /></button>)}</section></div>
    {gap && <section className={`${styles.card} ${styles.gapEditor}`}><div className={styles.cardHeading}><div><p className={styles.eyebrow}>QUESTION REVIEW</p><h2>{gap.question}</h2><p>{gap.count} occurrences in {gap.sessions} sample conversations</p></div><button className={styles.iconButton} aria-label="Close question review" onClick={closeGap}><X size={19} /></button></div>
      <div className={styles.diagnosis}><TriangleAlert size={19} aria-hidden="true" /><p>{gap.outcomes.includes("missing_content") ? "Check whether this information should be public. Add an owner-confirmed source before preparing an answer." : gap.outcomes.includes("retrieval_miss") ? "The information may already exist. Inspect chunks and retrieval before writing duplicate knowledge." : gap.outcomes.includes("provider_failure") ? "This is a service failure. Review provider health and budget controls; new knowledge will not fix it." : "Respect the privacy boundary. Do not add private details to make this question answerable."}</p></div>
      <div className={styles.gapFields}><label>Review status<select aria-label="Review status" value={gapStatus} onChange={(e) => setGapStatus(e.target.value as GapStatus)}><option value="new">New</option><option value="investigating">Investigating</option><option value="drafted">Draft prepared</option><option value="closed">Closed after review</option></select></label><label>Review note<textarea aria-label="Review note" maxLength={1000} value={gapNote} placeholder="What needs checking? What evidence would resolve this?" onChange={(e) => setGapNote(e.target.value)} /></label></div><div className={styles.editorActions}><button className={styles.primaryButton} disabled={!store || saving} onClick={() => void save({ action: "triage", key: gap.key, status: gapStatus, note: gapNote })}>Save review</button><button className={styles.secondaryButton} onClick={() => prepareDraft(gap)}>Prepare knowledge draft</button><button className={styles.textButton} onClick={() => openChat(gap.conversationIds[0])}>Read example conversation <ArrowRight size={15} aria-hidden="true" /></button></div>
    </section>}
  </>;
}

export function Knowledge({ store, editor, setEditor, dirty, editDraft, saving, saveDraft }: {
  store: WorkspaceState | null; editor: Omit<Draft, "updatedAt"> | null; setEditor: (d: Omit<Draft, "updatedAt">) => void;
  dirty: boolean; editDraft: (d?: Draft) => void; saving: boolean; saveDraft: () => Promise<void>;
}) {
  function exportDraft() {
    if (!editor) return;
    const text = `# DRAFT — not published\n\n# ${editor.title}\n\n${editor.body}\n\n## Provenance\n\n${editor.provenance}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "ev-knowledge-draft.md"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={styles.knowledgeGrid}>
    <section className={styles.card}><div className={styles.cardHeading}><div><h2>Draft library</h2><p>{store?.drafts.length ?? 0} saved locally</p></div><button className={styles.iconButton} aria-label="New knowledge draft" onClick={() => editDraft()}><Plus size={19} /></button></div>{store?.drafts.length ? store.drafts.map((d) => <button key={d.id} className={`${styles.draftRow} ${editor?.id === d.id ? styles.selected : ""}`} onClick={() => editDraft(d)}><FileText size={18} aria-hidden="true" /><span><strong>{d.title}</strong><small>{time(d.updatedAt)} UTC</small><Tag tone={d.status === "ready_for_review" ? "green" : "neutral"}>{d.status.replaceAll("_", " ")}</Tag></span></button>) : <div className={styles.empty}><FileText size={28} aria-hidden="true" /><h3>A place for better answers</h3><p>Start a draft from a question gap, or add a verified piece of information.</p><button className={styles.textButton} onClick={() => editDraft()}>Create your first draft <ArrowRight size={15} aria-hidden="true" /></button></div>}</section>
    <section className={styles.card}>{editor ? <form onSubmit={async (event) => { event.preventDefault(); await saveDraft(); }}>
      <div className={styles.cardHeading}><div><h2>Knowledge editor</h2><p>{dirty ? "Unsaved changes" : "Prepare an owner-reviewed source"}</p></div><Tag>Not published</Tag></div><div className={styles.formBody}>
        {editor.gapKey && <p className={styles.linkedGap}><Sparkles size={15} aria-hidden="true" /> Linked to a question gap</p>}
        <label>Title<input aria-label="Title" required maxLength={160} value={editor.title} placeholder="A clear question or topic" onChange={(e) => setEditor({ ...editor, title: e.target.value })} /></label>
        <label>Knowledge content<textarea aria-label="Knowledge content" required maxLength={20_000} rows={9} value={editor.body} placeholder="Write only facts that OJ can verify and approve for publication…" onChange={(e) => setEditor({ ...editor, body: e.target.value })} /></label>
        <label>Source / owner confirmation<textarea aria-label="Source / owner confirmation" required maxLength={1000} rows={3} value={editor.provenance} placeholder="Where did this information come from? Include a public source or record the owner's confirmation." onChange={(e) => setEditor({ ...editor, provenance: e.target.value })} /></label>
        <label>Draft status<select aria-label="Draft status" value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value as Draft["status"] })}><option value="draft">Draft</option><option value="ready_for_review">Ready for owner review</option></select></label>
        <div className={styles.draftFacts}><span>{editor.body.trim() ? editor.body.trim().split(/\s+/).length : 0} words</span><span>Exact token validation runs during staging</span></div>
        <div className={styles.editorActions}><button type="submit" className={styles.primaryButton} disabled={!store || saving}><Check size={16} aria-hidden="true" />{saving ? "Saving…" : "Save draft"}</button><button type="button" className={styles.secondaryButton} onClick={exportDraft} disabled={!editor.title || !editor.body}><ArrowDownToLine size={15} aria-hidden="true" />Export Markdown</button></div>
        <p className={styles.formNote}>Saving keeps this draft on this computer. It does not change E.V’s answers. Source review, exact chunk validation, evaluation and an approved release come next.</p>
      </div></form> : <div className={styles.editorPlaceholder}><BookOpen size={37} strokeWidth={1.2} aria-hidden="true" /><h2>Every good answer starts with a source.</h2><p>Select a draft to continue, or add something E.V should know.</p><button className={styles.primaryButton} onClick={() => editDraft()}><Plus size={16} aria-hidden="true" />Add knowledge</button></div>}</section>
  </div>;
}
