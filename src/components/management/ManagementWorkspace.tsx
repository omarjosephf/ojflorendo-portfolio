"use client";

import Link from "next/link";
import { ThemeSelect } from "@/components/theme/ThemeSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronRight, FileText, LayoutDashboard, LockKeyhole, MessageSquare, Plus, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { sampleAnchor, sampleConversations } from "@/lib/management/fixtures";
import { summarize, type QuestionGroup } from "@/lib/management/analytics";
import type { CorpusSnapshot, Draft, GapStatus, WorkspaceMutation, WorkspaceState } from "@/lib/management/types";
import { isWorkspaceState } from "@/lib/management/validation";
import { Overview, Conversations } from "./ConversationViews";
import { Questions, Knowledge } from "./EditorialViews";
import { Sources, Quality } from "./SourceViews";
import styles from "./management.module.css";

type View = "overview" | "conversations" | "questions" | "knowledge" | "sources" | "quality";
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "questions", label: "Questions & gaps", icon: Sparkles },
  { id: "knowledge", label: "Knowledge drafts", icon: FileText },
  { id: "sources", label: "Sources & chunks", icon: BookOpen },
  { id: "quality", label: "Quality & operations", icon: ShieldCheck },
] as const;
const descriptions: Record<View, string> = {
  overview: "Understand the conversations. Improve the next answer.",
  conversations: "Read the exchange and follow the evidence behind each answer.",
  questions: "Turn recurring questions into considered improvements.",
  knowledge: "Give a missing answer a source, then prepare it for review.",
  sources: "Inspect the actual material available to E.V.",
  quality: "See what is verified, what needs attention, and what can ship.",
};
export type SaveMutation = Omit<Extract<WorkspaceMutation, { action: "save_draft" }>, "revision"> | Omit<Extract<WorkspaceMutation, { action: "triage" }>, "revision">;
export type Report = ReturnType<typeof summarize>;

export function ManagementWorkspace({ corpus, initialStore, initialError, liveEnabled = false }: { corpus: CorpusSnapshot; initialStore: WorkspaceState | null; initialError: string; liveEnabled?: boolean }) {
  const [view, setView] = useState<View>("overview");
  const [days, setDays] = useState(7);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [store, setStore] = useState<WorkspaceState | null>(initialStore);
  const [storeError, setStoreError] = useState(initialError);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<Omit<Draft, "updatedAt"> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [gap, setGap] = useState<QuestionGroup | null>(null);
  const [gapNote, setGapNote] = useState("");
  const [gapStatus, setGapStatus] = useState<GapStatus>("investigating");
  const heading = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const sources = useMemo(() => [...new Set(corpus.chunks.map((c) => c.source))].sort(), [corpus]);
  const report = useMemo(() => summarize(sampleConversations, sampleAnchor, days, sources), [days, sources]);

  async function loadStore() {
    try {
      const response = await fetch("/api/management/workspace", { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok || !isWorkspaceState(data)) throw new Error("Invalid store");
      setStore(data); setStoreError("");
    } catch { setStoreError("The local workspace could not be read. Existing data have not been reset."); }
  }
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  function navigate(next: View) { setView(next); setNotice(""); requestAnimationFrame(() => heading.current?.focus()); }
  async function save(mutation: SaveMutation) {
    if (!store || busy.current) return false;
    busy.current = true; setSaving(true); setNotice("");
    try {
      const response = await fetch("/api/management/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...mutation, revision: store.revision }) });
      const data = await response.json();
      if (!response.ok || !isWorkspaceState(data)) throw new Error(data.error || "Not saved. Your editor text is preserved.");
      setStore(data); setStoreError(""); setNotice("Saved to this local workspace."); return true;
    } catch (error) { setStoreError(error instanceof Error ? error.message : "Not saved. Your editor text is preserved."); return false; }
    finally { busy.current = false; setSaving(false); }
  }
  function editDraft(draft?: Draft, fromGap?: QuestionGroup) {
    if (dirty && !window.confirm("Discard the unsaved changes in your current draft?")) return;
    setEditor(draft ? { ...draft } : { id: crypto.randomUUID(), title: fromGap?.question ?? "", body: "", provenance: "", gapKey: fromGap?.key ?? null, status: "draft" });
    setDirty(false); navigate("knowledge");
  }
  function openGap(item: QuestionGroup) {
    setGap(item); setGapNote(store?.triage[item.key]?.note ?? ""); setGapStatus(store?.triage[item.key]?.status ?? "investigating");
    navigate("questions");
  }
  function openChat(id: string) { setSelectedChat(id); navigate("conversations"); }
  function openSource(source: string) { setSelectedSource(source); navigate("sources"); }

  return <div className={styles.workspace}>
    <a className={styles.skip} href="#workspace-content">Skip to workspace</a>
    <aside className={styles.sidebar} aria-label="E.V workspace">
      <Link className={styles.brand} href="/manage" aria-label="E.V management overview"><span className={styles.brandMark}>e<span>v</span><i /></span><span>E.V<span className={styles.brandSub}>MANAGEMENT</span></span></Link>
      <div className={styles.projectSwitch}><span className={styles.projectIcon}>OJ</span><span><strong>OJ’s portfolio</strong><small>Smart Assistant</small></span><span className={styles.onlineDot} /></div>
      <p className={styles.navLabel}>WORKSPACE</p>
      <nav aria-label="Management sections" className={styles.nav}>{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={18} aria-hidden="true" /><span>{label}</span>{id === "questions" && <span className={styles.navCount}>{report.gaps.length}</span>}</button>)}</nav>
      <div className={styles.sidebarBottom}><div><LockKeyhole size={17} aria-hidden="true" /><strong>Private preview</strong></div>{liveEnabled && <Link href="/manage/live">Open saved conversations <ArrowRight size={14} aria-hidden="true" /></Link>}<p>A workspace taking shape.<br />Your public assistant is separate.</p><Link href="/">View portfolio <ArrowRight size={14} aria-hidden="true" /></Link><div className={styles.owner}><span>OJ</span><div><strong>OJ Florendo</strong><small>Local workspace · no sign-in</small></div></div></div>
    </aside>
    <div className={styles.canvas}>
      <div className={styles.topbar}><span>Workspace <ChevronRight size={13} aria-hidden="true" /> <strong>{navigation.find((n) => n.id === view)?.label}</strong></span><div className={styles.topbarActions}><span className={styles.previewIndicator}><span /> LOCAL PREVIEW</span><ThemeSelect label="Workspace color theme" /></div></div>
      <main id="workspace-content" className={styles.content}>
        <div className={styles.pageHeading}><div><p className={styles.eyebrow}>E.V INTELLIGENCE WORKSPACE</p><h1 ref={heading} tabIndex={-1}>{navigation.find((n) => n.id === view)?.label}</h1><p>{descriptions[view]}</p></div><button className={styles.primaryButton} type="button" onClick={() => editDraft()}><Plus size={17} aria-hidden="true" /> Add knowledge</button></div>
        <div className={styles.previewBanner}><span><span className={styles.sampleDot} /><strong>Sample activity</strong> · Synthetic chats ending 8 Sep 2026. Sources are the actual corpus; drafts save locally.</span><LockKeyhole size={15} aria-label="Local only" /></div>
        <div role="status" aria-live="polite" className={notice ? styles.successNotice : styles.srOnly}>{notice}</div>
        {storeError && <div role="alert" className={styles.errorNotice}><TriangleAlert size={18} aria-hidden="true" /><span>{storeError}</span><button type="button" onClick={() => void loadStore()}>Reload saved workspace</button></div>}
        {["overview", "conversations", "questions"].includes(view) && <div className={styles.reportControls}><span><span className={styles.onlineDot} /> {report.sessions} sample conversations in this window</span><label>Reporting period <select aria-label="Reporting period" value={days} onChange={(e) => { setDays(Number(e.target.value)); setGap(null); }}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></label></div>}
        {view === "overview" && <Overview report={report} days={days} openChat={openChat} openGap={openGap} openSource={openSource} showConversations={() => navigate("conversations")} showQuestions={() => navigate("questions")} />}
        {view === "conversations" && <Conversations report={report} corpus={corpus} selectedChat={selectedChat} setSelectedChat={setSelectedChat} openSource={openSource} />}
        {view === "questions" && <Questions report={report} store={store} gap={gap} openGap={openGap} closeGap={() => setGap(null)} gapNote={gapNote} setGapNote={setGapNote} gapStatus={gapStatus} setGapStatus={setGapStatus} saving={saving} save={save} openChat={openChat} prepareDraft={(item) => editDraft(undefined, item)} />}
        {view === "knowledge" && <Knowledge store={store} editor={editor} setEditor={(next) => { setEditor(next); setDirty(true); }} dirty={dirty} editDraft={editDraft} saving={saving} saveDraft={async () => { if (editor && await save({ action: "save_draft", draft: editor })) setDirty(false); }} />}
        {view === "sources" && <Sources corpus={corpus} sources={sources} selectedSource={selectedSource} selectSource={setSelectedSource} report={report} days={days} />}
        {view === "quality" && <Quality corpus={corpus} store={store} report={report} />}
        <footer className={styles.footer}><span>E.V · Thoughtful answers, traceable knowledge.</span><span><LockKeyhole size={12} aria-hidden="true" /> Local workspace · no production data</span></footer>
      </main>
    </div>
  </div>;
}
