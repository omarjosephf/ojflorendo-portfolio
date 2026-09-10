"use client";
import {LiveGapReviews} from "./LiveGapReviews";
import {useEffect,useId,useRef,useState} from "react";
import type {DraftSave,DraftSummary,DraftHistory,LiveDraft,OwnerReport} from "@/lib/management/owner-operations";
import styles from "./management.module.css";
import live from "./live-owner.module.css";
type Editor=Omit<DraftSave,"requestId">;
export function LiveOwnerOperations({onUnauthorized,preview=true}:{onUnauthorized:()=>void;preview?:boolean}){
 const fieldId=useId();
 const [report,setReport]=useState<OwnerReport|null>(null),[days,setDays]=useState<7|30>(7);
 const [drafts,setDrafts]=useState<DraftSummary[]>([]),[editor,setEditor]=useState<Editor|null>(null),[remote,setRemote]=useState<LiveDraft|null>(null),[history,setHistory]=useState<DraftHistory[]>([]);
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const active=useRef(false),pending=useRef<DraftSave|null>(null);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
 async function request(query:string,body?:unknown){
  const res=await fetch(`/api/management/operations${query}`,{method:body===undefined?"GET":"POST",headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000),cache:"no-store"});
  const data=await res.json();if(!res.ok){if(res.status===401)onUnauthorized();throw new Error(data.error??"The operation could not be confirmed.");}return data;
 }
 async function run(fn:()=>Promise<void>){if(active.current)return;active.current=true;setBusy(true);setError("");setNotice("");try{await fn();}catch(e){setError(e instanceof Error?e.message:"The operation could not be confirmed. Keep your text and retry.");}finally{active.current=false;setBusy(false);}}
 function edit(field:"title"|"body"|"provenance"|"status",value:string){setEditor(d=>d?{...d,[field]:value}:d);setDirty(true);pending.current=null;setNotice("");}
 function adopt(d:LiveDraft){setEditor({id:d.id,revision:d.revision,title:d.title,body:d.body,provenance:d.provenance,status:d.status});setDirty(false);setRemote(null);setHistory([]);pending.current=null;}
 async function save(){if(!editor)return;pending.current??={...editor,requestId:crypto.randomUUID()};const result=await request("",pending.current);if(result.saved?.id!==editor.id||result.saved.revision!==editor.revision+1)throw new Error("Save could not be verified. Keep your text and retry.");const revision=result.saved.revision;setEditor({...editor,revision});setDirty(false);pending.current=null;setRemote(null);setHistory([]);setNotice(`Saved revision ${revision}${preview?" to staging":""}. The answering corpus has not changed.`);setDrafts(old=>[{...editor,revision,updated_at:new Date().toISOString()},...old.filter(d=>d.id!==editor.id)].slice(0,100));}
 return <div className={live.operations}>
  {error&&<p role="alert" className={styles.errorNotice}>{error}</p>}{notice&&<p role="status">{notice}</p>}
  <details className={styles.card}><summary>Conversation reporting</summary><div className={live.operationBody}>
   <p>Counts from retained E.V chats. Questions are grouped by exact wording after ignoring capitalization and repeated spaces.</p>
   <div className={live.actions}><label>Reporting window <select value={days} disabled={busy} onChange={e=>{setDays(Number(e.target.value) as 7|30);setReport(null);}}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></label><button className={styles.primaryButton} disabled={busy} onClick={()=>void run(async()=>setReport((await request(`?view=report&days=${days}`)).report))}>Refresh report</button></div>
   {report&&<>
    <p>As of {new Date(report.asOf).toLocaleString("en-GB",{timeZone:"UTC"})} UTC. {report.truncated?"Limited to the newest 1,000 questions; these are partial totals.":"All retained questions in this window are included."} Deleted and expired chats are excluded.</p>
    <dl className={live.metrics}><div><dt>Questions</dt><dd>{report.questions}</dd></div><div><dt>Conversations</dt><dd>{report.conversations}</dd></div><div><dt>Saved replies</dt><dd>{report.replies}</dd></div><div><dt>Replies with diagnostics</dt><dd>{report.events} / {report.replies}</dd></div></dl>
    <p>Helpful feedback: {report.helpful} of {report.feedback} ratings. {report.feedback} of {report.replies} saved replies received a rating. Conversations are separate chats, not a count of individual people.</p>
    <div className={live.reportColumns}><section><h2>Most frequent questions</h2>{!report.topQuestions.length&&<p>No retained questions in this window.</p>}<ol>{report.topQuestions.map((q,i)=><li key={i}><span>{q.question}{q.shortened?"… (shortened)":""}</span> <strong>{q.count} {q.count===1?"question":"questions"}</strong></li>)}</ol></section>
    <section><h2>Citation exposure</h2><p>Observed citations in {report.events} diagnostic records. This does not measure reading time or interest.</p>{!report.sources.length&&<p>No citation exposure has been recorded.</p>}<ul>{report.sources.map((s,i)=><li key={i}><span>{s.source}</span> <strong>{s.citations} {s.citations===1?"reply":"replies"}</strong></li>)}</ul><h3>Recorded outcomes</h3><ul>{Object.entries(report.outcomes).map(([name,n])=><li key={name}>{name.replaceAll("_"," ")}: {n}</li>)}</ul></section></div>
   </>}
  </div></details>
  <LiveGapReviews onUnauthorized={onUnauthorized}/>
  <details className={styles.card}><summary>Knowledge drafts</summary><div className={live.operationBody}>
   <p>Add verified information with its source. Saving or marking a draft ready for review does not publish it or change chatbot answers.</p>
   <div className={live.actions}><button className={styles.textButton} disabled={busy} onClick={()=>void run(async()=>setDrafts((await request("?view=drafts")).drafts))}>Refresh drafts</button><button className={styles.primaryButton} disabled={busy||dirty} onClick={()=>{setEditor({id:crypto.randomUUID(),revision:0,title:"",body:"",provenance:"",status:"draft"});setHistory([]);setRemote(null);pending.current=null;setNotice("");}}>New knowledge draft</button></div>
   <p>The 100 most recently updated drafts are shown. Save or explicitly discard your edits before opening another draft.</p>
   <div className={live.editorGrid}><section aria-label="Saved knowledge drafts">{drafts.map(d=><button className={styles.chatRow} key={d.id} disabled={busy||dirty} onClick={()=>void run(async()=>adopt((await request(`?view=draft&id=${d.id}`)).draft))}><strong>{d.title}</strong><small>Revision {d.revision} · {d.status.replaceAll("_"," ")}</small></button>)}{!drafts.length&&<p>Refresh to check for saved drafts.</p>}</section>
    {editor&&<section><form className={live.editorForm} onSubmit={e=>{e.preventDefault();void run(save);}}>
     <label>Draft title<input required maxLength={160} value={editor.title} disabled={busy} onChange={e=>edit("title",e.target.value)}/></label>
     <div><label htmlFor={`${fieldId}-body`}>Verified information</label><textarea id={`${fieldId}-body`} required rows={9} maxLength={20000} value={editor.body} disabled={busy} onChange={e=>edit("body",e.target.value)}/></div>
     <div><label htmlFor={`${fieldId}-evidence`}>Evidence and provenance</label><textarea id={`${fieldId}-evidence`} required rows={3} maxLength={1000} value={editor.provenance} disabled={busy} onChange={e=>edit("provenance",e.target.value)}/></div>
     <label>Review status<select value={editor.status} disabled={busy} onChange={e=>edit("status",e.target.value)}><option value="draft">Draft</option><option value="ready_for_review">Ready for review</option></select></label>
     <p>{dirty?"Unsaved edits. Keep this page open until saving succeeds.":editor.revision>0?`Saved revision ${editor.revision}.`:"New draft. Nothing saved yet."}</p>
     <button className={styles.primaryButton} type="submit" disabled={busy||!dirty}>Save knowledge draft</button>
     <button className={styles.textButton} type="button" disabled={busy||!dirty} onClick={()=>{setEditor(null);setDirty(false);setRemote(null);setHistory([]);pending.current=null;setNotice("Unsaved editor text discarded. Saved records are unchanged.");}}>Discard unsaved edits</button>
    </form>
    <div className={live.actions}><button className={styles.textButton} disabled={busy} onClick={()=>void run(async()=>setRemote((await request(`?view=draft&id=${editor.id}`)).draft))}>Check saved version</button>{editor.revision>0&&<button className={styles.textButton} disabled={busy} onClick={()=>void run(async()=>setHistory((await request(`?view=history&id=${editor.id}`)).history))}>Show save history</button>}</div>
    {remote&&<section className={live.savedVersion}><h3>Current saved revision {remote.revision}</h3><p>{remote.title}</p><p className={live.message}>{remote.body}</p><p className={live.message}>Evidence: {remote.provenance}</p><p>Status: {remote.status.replaceAll("_"," ")}</p><button className={styles.textButton} disabled={busy} onClick={()=>adopt(remote)}>Replace editor with saved version</button></section>}
    {history.length>0&&<section><h3>Recent save history</h3><p>Latest 20 save receipts. These record the editor, revision and content fingerprint; they are not recoverable copies of earlier text.</p><ol>{history.map(h=><li key={h.revision}>Revision {h.revision} · {h.status.replaceAll("_"," ")} · {new Date(h.saved_at).toLocaleString("en-GB",{timeZone:"UTC"})} UTC · Editor {h.actor_id.slice(0,8)}</li>)}</ol></section>}
   </section>}
   </div>
  </div></details>
 </div>;
}

