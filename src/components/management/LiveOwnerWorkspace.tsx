"use client";
import Link from "next/link";
import { TurnstileWidget } from "@/components/sections/TurnstileWidget";
import { LiveOwnerOperations } from "./LiveOwnerOperations";
import { BlogAdminOverview } from "./BlogAdminOverview";
import { RagConfiguration } from "./RagViews";
import { isRagSnapshot, type RagSnapshot } from "@/lib/management/rag-snapshot";
import { useEffect, useRef, useState } from "react";
import { ThemeSelect } from "@/components/theme/ThemeSelect";
import type { OwnerConversation } from "@/lib/management/owner-session";
import type { OwnerMessage } from "@/lib/management/owner-session";
import styles from "./management.module.css";
import live from "./live-owner.module.css";

type Status="checking"|"setup_required"|"signed_out"|"mfa_required"|"ready";
type Section="ev"|"blog";
export function LiveOwnerWorkspace({nonce,preview=true}:{nonce?:string;preview?:boolean}={}){
  const [captcha,setCaptcha]=useState<{required:boolean;siteKey:string|null}>({required:false,siteKey:null});
  const [captchaToken,setCaptchaToken]=useState(""),[captchaReset,setCaptchaReset]=useState(0);
  function captchaConfiguration(data:{authCaptcha?:{required?:unknown;siteKey?:unknown}}){
    if(data.authCaptcha)setCaptcha({required:data.authCaptcha.required===true,siteKey:typeof data.authCaptcha.siteKey==="string"&&/^[a-zA-Z0-9_-]{10,100}$/.test(data.authCaptcha.siteKey)?data.authCaptcha.siteKey:null});
  }
  const [status,setStatus]=useState<Status>("checking"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[code,setCode]=useState(""),[confirmPassword,setConfirmPassword]=useState("");
  const [factor,setFactor]=useState<string|null>(null),[secret,setSecret]=useState("");
  const [conversations,setConversations]=useState<OwnerConversation[]>([]),[next,setNext]=useState<string|null>(null);
  const [messages,setMessages]=useState<OwnerMessage[]>([]),[selected,setSelected]=useState<string|null>(null);
  const [section,setSection]=useState<Section>("ev"),[rag,setRag]=useState<RagSnapshot|null>(null),[ragNotice,setRagNotice]=useState("");
  const active=useRef(false);
  async function request(query="",body?:unknown){
    const response=await fetch(`/api/management/owner${query}`,{method:body===undefined?"GET":"POST",headers:body===undefined?undefined:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(10000)});
    const data=await response.json();captchaConfiguration(data);
    if(!response.ok){if(response.status===401){setStatus("signed_out");setMessages([]);setConversations([]);setSelected(null);setSecret("");setRag(null);setRagNotice("");}throw new Error(data.error??"Owner workspace is unavailable.");}
    return data;
  }
  function session(data:{status:Status;factorId?:string|null;secret?:string;email?:string}){
    if(data.email)setEmail(data.email);
    setStatus(data.status);setFactor(data.factorId??null);setSecret(data.secret??"");
    if(data.status!=="ready"){setConversations([]);setMessages([]);setSelected(null);setRag(null);setRagNotice("");setSection("ev");}
  }
  async function run(action:()=>Promise<void>){
    if(active.current)return;active.current=true;setBusy(true);setError("");
    try{await action();}catch(e){setError(e instanceof Error?e.message:"Owner workspace is unavailable.");}
    finally{active.current=false;setBusy(false);}
  }
  async function load(after?:string){
    const data=await request(`?view=conversations${after?`&after=${encodeURIComponent(after)}`:""}`);
    if(data.status==="signed_out"){session(data);return;}
    if(!Array.isArray(data.conversations)||!(data.next===null||typeof data.next==="string"))throw new Error("The conversation list could not be verified.");
    setConversations(old=>after?[...new Map([...old,...data.conversations].map(c=>[c.id,c])).values()]:data.conversations);setNext(data.next);
  }
  async function loadRag(){
    setRagNotice("");const data=await request("?view=rag");
    if(data.status==="signed_out"){session(data);return;}
    if(!isRagSnapshot(data.rag)){setRag(null);setRagNotice("The RAG configuration could not be verified. Nothing is shown rather than unverified figures.");return;}
    setRag(data.rag);
  }
  useEffect(()=>{
    let disposed=false;
    void fetch("/api/management/owner",{cache:"no-store",signal:AbortSignal.timeout(10000)}).then(async res=>{const data=await res.json();if(!disposed){captchaConfiguration(data);if(res.ok&&["ready","signed_out","mfa_required","setup_required"].includes(data.status))session(data);else{setStatus("signed_out");setError(data.error??"Owner access is unavailable.");}}}).catch(()=>{if(!disposed){setStatus("signed_out");setError("Owner access could not be checked.");}});
    return()=>{disposed=true;};
  },[]);
  return <div className={`${styles.workspace} ${live.shell}`}>
    <header className={live.header}><Link href="/manage">Owner admin</Link><div>{preview&&<Link href="/manage">Sample workspace</Link>}<ThemeSelect label="Workspace color theme" /></div></header>
    <main className={live.main}>
      <p className={styles.eyebrow}>{preview?"PRIVATE STAGING":"PRIVATE WORKSPACE"}</p><h1>{status!=="ready"?"Owner admin":section==="ev"?"E.V assistant":"Blog agents"}</h1>
      <p>{status!=="ready"?"One private panel for the E.V assistant and the blog agents. Owner access requires a password and an authenticator.":section==="ev"?"Read retained chats, review answer gaps and check the retrieval configuration.":"What the blog agents are designed to do and what they may never do. Read-only."}</p>
      {error&&<p className={styles.errorNotice} role="alert">{error}</p>}
      {status==="checking"&&<p role="status">Checking owner access…</p>}
      {status==="setup_required"&&<form className={`${styles.card} ${live.form}`} onSubmit={e=>{e.preventDefault();if(password!==confirmPassword){setError("The passwords do not match.");return;}const value=password;setPassword("");setConfirmPassword("");void run(async()=>session(await request("",{action:"initialize",password:value})));}}>
        <h2>Set your owner password</h2><p>Your account is prepared for {email}. Choose a password, then connect your authenticator.</p>
        <label>New password<input type="password" autoComplete="new-password" minLength={14} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
        <label>Confirm password<input type="password" autoComplete="new-password" minLength={14} maxLength={128} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} disabled={busy}/></label>
        <p>Use at least 14 characters, with upper- and lower-case letters, a digit and a symbol. A password manager can create and save it for you.</p><button className={styles.primaryButton} type="submit" disabled={busy}>Set password and continue</button>
        <p>This one-time setup is available only in your local preview.</p><button type="button" className={styles.textButton} disabled={busy} onClick={()=>setStatus("signed_out")}>Already set? Sign in</button>
      </form>}
      {status==="signed_out"&&<form className={`${styles.card} ${live.form}`} onSubmit={e=>{e.preventDefault();if(active.current||(captcha.required&&!captchaToken))return;const credential=password,token=captchaToken;setPassword("");setCaptchaToken("");void run(async()=>{try{session(await request("",{action:"sign_in",email,password:credential,...(token?{captchaToken:token}:{})}));}finally{setCaptchaToken("");setCaptchaReset(value=>value+1);}});}}>
        <h2>Owner sign-in</h2><p>Use your E.V owner account. Your Supabase dashboard login is separate.</p>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} disabled={busy}/></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={1024} disabled={busy}/></label>
        {captcha.required&&(captcha.siteKey?<TurnstileWidget siteKey={captcha.siteKey} nonce={nonce} theme="auto" onToken={setCaptchaToken} resetSignal={captchaReset} failureMessage="Verification couldn’t load. Reload the page to try signing in again."/>:<p role="alert">Owner verification is temporarily unavailable. Reload the page or use the documented recovery process.</p>)}
        <button className={styles.primaryButton} disabled={busy||(captcha.required&&!captchaToken)} type="submit">Sign in</button>
        <p>An owner account must be provisioned before signing in. Access cannot be granted through this form.</p>
      </form>}
      {status==="mfa_required"&&<section className={`${styles.card} ${live.form}`}><h2>Verify your authenticator</h2>
        <p id="owner-authenticator-help">Your authenticator app generates the six-digit code on your phone. E.V does not send it by email or text message.</p>
        {!factor&&<><p>First, install and open <a href="https://www.google.com/mobile/authenticator/" target="_blank" rel="noopener noreferrer">Google Authenticator (Android or iPhone)</a>, or use an authenticator you already have. Then choose the button below to connect E.V Management.</p><button type="button" className={styles.primaryButton} disabled={busy} onClick={()=>void run(async()=>session(await request("",{action:"enroll"})))}>Set up authenticator</button></>}
        {secret&&<div>
          <h3>Connect E.V Management to your phone</h3>
          <ol className={live.authenticatorSteps}>
            <li>Open Google Authenticator on your phone. Tap <strong>+</strong>, then <strong>Enter a setup key</strong>. Other apps may call this Add account or Manual entry.</li>
            <li>Name the account <strong>E.V Management</strong>. Enter the setup key below, choose <strong>Time based</strong> if asked, then save the account.</li>
            <li>Find the six-digit code beside <strong>E.V Management</strong> in the app. Enter that code in the form below and choose <strong>Verify</strong>.</li>
          </ol>
          <p><strong>Your E.V setup key</strong></p><code className={live.secret}>{secret}</code>
          <p>Keep this page open until verification. Keep the key private; do not send it or your code in chat.</p>
        </div>}
        {factor&&!secret&&<p>Open the authenticator you connected earlier and use the code for E.V Management. If you no longer have that account, owner access recovery is required.</p>}
        {factor&&<form onSubmit={e=>{e.preventDefault();const value=code;setCode("");void run(async()=>session(await request("",{action:"verify",factorId:factor,code:value})));}}><label>Six-digit code<input aria-describedby="owner-authenticator-help owner-authenticator-timing" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} disabled={busy}/></label><button className={styles.primaryButton} type="submit" disabled={busy}>Verify</button><p id="owner-authenticator-timing">The code changes regularly. If it is about to expire, wait for the next one. If a new code fails, check that your phone uses automatic date and time.</p></form>}
        <button className={styles.textButton} disabled={busy} onClick={()=>void run(async()=>session(await request("",{action:"sign_out"})))}>Sign out</button>
      </section>}
      {status==="ready"&&<>
        <div className={live.actions}><p>Owner verified · Authenticator required</p><button className={styles.textButton} disabled={busy} onClick={()=>void run(async()=>session(await request("",{action:"sign_out"})))}>Sign out</button></div>
        <nav aria-label="Admin sections" className={live.sectionNav}>{([["ev","E.V assistant"],["blog","Blog agents"]] as const).map(([id,label])=><button key={id} type="button" aria-current={section===id?"true":undefined} onClick={()=>setSection(id)}>{label}</button>)}</nav>
        {section==="blog"&&<BlogAdminOverview/>}
        {/* Hidden, not unmounted, so unsaved draft or gap-review text survives a section switch. */}
        <div hidden={section!=="ev"}>
        <div className={live.actions}><h2>Saved conversations</h2><button className={styles.primaryButton} disabled={busy} onClick={()=>void run(()=>load())}>Refresh conversations</button></div>
        <p>Newest first, 25 per page. Refresh to load current records. Deleted and expired chats are excluded.</p>
        <div className={`${styles.card} ${live.inbox}`}>
          <section aria-label="Saved conversation list" className={live.list}>
            {conversations.map(c=><button key={c.id} disabled={busy} aria-pressed={selected===c.id} className={styles.chatRow} onClick={()=>void run(async()=>{setMessages([]);setSelected(c.id);const data=await request(`?conversation=${c.id}`);if(data.status==="signed_out"){session(data);return;}if(!Array.isArray(data.messages))throw new Error("The saved transcript could not be read.");setMessages(data.messages);})}><span><strong>{new Date(c.created_at).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</strong><small>Chat {c.id.slice(0,8)} · Guest {c.user_id.slice(0,8)}</small></span></button>)}
            {!conversations.length&&<p className={styles.empty}>Refresh to check for saved conversations.</p>}
            {next&&<button className={styles.textButton} disabled={busy} onClick={()=>void run(()=>load(next))}>Load older conversations</button>}
          </section>
          <section aria-label="Saved transcript" className={styles.transcript}>
            <h2>{selected?`Chat ${selected.slice(0,8)}`:"Choose a conversation"}</h2>
            {selected&&!messages.length&&<p>No readable messages. The chat may have expired or been deleted.</p>}
            {messages.map(m=><article key={m.id} className={styles.exchange}><div className={m.role==="user"?styles.userMessage:styles.assistantMessage}><span>{m.role==="user"?"VISITOR":"E.V ASSISTANT"} · {new Date(m.created_at).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</span><p className={live.message}>{m.body}</p>{m.result&&<small>Stored response state: {m.result.state}</small>}{m.event?<details><summary>Inspect retrieval details</summary><dl className={styles.trace}><div><dt>Outcome</dt><dd>{m.event.outcome.replaceAll("_"," ")}</dd></div><div><dt>Route</dt><dd>{m.event.route}</dd></div><div><dt>Response time</dt><dd>{(m.event.latencyMs/1000).toFixed(2)}s</dd></div></dl><p>Retrieved: {m.event.retrieved.join(", ")||"No sources retrieved"}</p><p>Cited: {m.event.cited.join(", ")||"No citations returned"}</p><p>Model: {m.event.model||"No model used"}</p><p>Corpus: {m.event.corpusSha256.slice(0,12)} · Prompt: {m.event.promptSha256.slice(0,12)}</p>{m.event.outcome==="not_covered"&&<p>Review the sources before deciding whether knowledge is missing or retrieval needs adjustment.</p>}</details>:m.role==="assistant"&&<p>No retrieval details were recorded for this reply.</p>}</div></article>)}
          </section>
        </div><p>Questions and replies are stored facts. Retrieval diagnostics and interest reports are not inferred from missing telemetry.</p>
        <LiveOwnerOperations preview={preview} onUnauthorized={()=>session({status:"signed_out"})}/>
        <section className={live.ragSection} aria-labelledby="rag-configuration">
          <div className={live.actions}><h2 id="rag-configuration">RAG configuration</h2><button className={styles.textButton} disabled={busy} onClick={()=>void run(loadRag)}>{rag?"Reload RAG configuration":"Show RAG configuration"}</button></div>
          <p>Read-only. Chunking, the embedding model and the cost per answer, from the committed corpus snapshot.</p>
          {ragNotice&&<p role="status">{ragNotice}</p>}
          {rag&&<RagConfiguration corpus={rag}/>}
        </section>
        </div>
      </>}
      <footer className={styles.footer}>{preview?"Private staging · No public release":"Private workspace · Owner access only"}</footer>
    </main>
  </div>;
}

