"use client";
import {useEffect,useId,useRef,useState} from "react";
import {gapDiagnoses,gapStatuses,type LiveGap,type GapReviewSave} from "@/lib/management/owner-gaps";
import type {DraftSummary} from "@/lib/management/owner-operations";
import styles from "./management.module.css";
import live from "./live-owner.module.css";
export function LiveGapReviews({onUnauthorized}:{onUnauthorized:()=>void}){
 const fieldId=useId();
 const [gaps,setGaps]=useState<LiveGap[]>([]),[drafts,setDrafts]=useState<DraftSummary[]>([]),[editor,setEditor]=useState<LiveGap|null>(null);
 const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const active=useRef(false),pending=useRef<GapReviewSave|null>(null);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
 async function request(path:string,body?:unknown){
  const res=await fetch(path,{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,cache:"no-store",signal:AbortSignal.timeout(10000)});
  const data=await res.json();if(!res.ok){if(res.status===401)onUnauthorized();throw new Error(data.error??"Review unavailable. Keep your note and retry.");}return data;
 }
 async function run(fn:()=>Promise<void>){if(active.current)return;active.current=true;setBusy(true);setError("");setNotice("");try{await fn();}catch(e){setError(e instanceof Error?e.message:"Review unavailable. Keep your note.");}finally{active.current=false;setBusy(false);}}
 function select(gap:LiveGap){setEditor(gap);setDirty(false);pending.current=null;setNotice("");}
 function edit(patch:Partial<LiveGap>){setEditor(old=>old?{...old,...patch}:old);setDirty(true);pending.current=null;setNotice("");}
 async function refresh(){const [queue,knowledge]=await Promise.all([request("/api/management/gaps"),request("/api/management/operations?view=drafts")]);setGaps(queue.gaps);setDrafts(knowledge.drafts);}
 async function save(){
  if(!editor)return;pending.current??={messageId:editor.message_id,requestId:crypto.randomUUID(),revision:editor.revision,diagnosis:editor.diagnosis,status:editor.status,note:editor.note,draftId:editor.draft_id};
  const {saved}=await request("/api/management/gaps",pending.current);
  if(saved?.messageId!==editor.message_id||saved.revision!==editor.revision+1)throw new Error("Save could not be verified. Keep your note and retry.");
  const updated={...editor,revision:saved.revision};setEditor(updated);setGaps(old=>old.map(g=>g.message_id===updated.message_id?updated:g));setDirty(false);pending.current=null;setNotice(`Saved review revision ${saved.revision}.`);
 }
 return <details className={styles.card}><summary>Gap reviews</summary><div className={live.operationBody}>
  <p>Review unsupported replies, unavailable answers and negative feedback. An unanswered question does not prove that information is missing.</p>
  {error&&<p role="alert" className={styles.errorNotice}>{error}</p>}{notice&&<p role="status">{notice}</p>}
  <button className={styles.primaryButton} disabled={busy||dirty} onClick={()=>void run(refresh)}>Refresh gap reviews</button>
  <p>Newest 100 retained replies needing review. Deleted or expired conversations disappear together with their review notes.</p>
  <div className={live.editorGrid}><section aria-label="Replies needing review">{gaps.map(g=><button className={styles.chatRow} key={g.message_id} disabled={busy||dirty} onClick={()=>select(g)}><strong>{g.question}{g.question_shortened?"… (shortened)":""}</strong><small>{g.observed.replaceAll("_"," ")} · {g.status}</small></button>)}{!gaps.length&&<p>Refresh to check for replies needing review.</p>}</section>
  {editor&&<section><h3>Review this reply</h3><p>{editor.question}{editor.question_shortened?"… (shortened)":""}</p><p className={live.message}>{editor.answer}{editor.answer_shortened?"… (shortened; open the saved conversation for the full reply)":""}</p>
   <p>Recorded outcome: {editor.observed.replaceAll("_"," ")}</p><p>Retrieved: {editor.retrieved.join(", ")||"No retrieval details recorded"}</p><p>Cited: {editor.cited.join(", ")||"No citations recorded"}</p>
   <form className={live.editorForm} onSubmit={e=>{e.preventDefault();void run(save);}}>
    <label>Review diagnosis<select value={editor.diagnosis} disabled={busy} onChange={e=>edit({diagnosis:e.target.value as LiveGap["diagnosis"]})}>{gapDiagnoses.map(d=><option key={d} value={d}>{d==="unclassified"?"Not yet diagnosed":d.replaceAll("_"," ")}</option>)}</select></label>
    <label>Gap review status<select value={editor.status} disabled={busy} onChange={e=>edit({status:e.target.value as LiveGap["status"]})}>{gapStatuses.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <div><label htmlFor={`${fieldId}-note`}>Review note</label><textarea id={`${fieldId}-note`} rows={4} maxLength={1000} value={editor.note} disabled={busy} onChange={e=>edit({note:e.target.value})}/></div>
    <label>Linked knowledge draft<select value={editor.draft_id??""} required={editor.status==="drafted"} disabled={busy} onChange={e=>edit({draft_id:e.target.value||null})}><option value="">No linked draft</option>{editor.draft_id&&!drafts.some(d=>d.id===editor.draft_id)&&<option value={editor.draft_id}>Previously linked draft</option>}{drafts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
    <p>Prepare and save a knowledge draft in the editor below before linking it. Reviewing or linking a draft does not publish facts or change E.V answers.</p>
    <p>{dirty?"Unsaved review. Keep this page open until saving succeeds.":`Saved review revision ${editor.revision}.`}</p>
    <button className={styles.primaryButton} type="submit" disabled={busy||!dirty}>Save gap review</button>
    <button className={styles.textButton} type="button" disabled={busy||!dirty} onClick={()=>{select(gaps.find(g=>g.message_id===editor.message_id)??editor);setNotice("Unsaved review edits discarded.");}}>Discard unsaved review edits</button>
    <button className={styles.textButton} type="button" disabled={busy} onClick={()=>void run(async()=>{const queue=await request("/api/management/gaps");const current=queue.gaps.find((g:LiveGap)=>g.message_id===editor.message_id);if(!current)throw new Error("This reply is no longer available. Copy any note you need before leaving.");setGaps(queue.gaps);select(current);setNotice("Editor replaced with the saved review.");})}>Replace review with saved version</button>
   </form>
  </section>}
  </div>
 </div></details>;
}
