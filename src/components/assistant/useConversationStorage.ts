"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseAssistantResult, type AssistantExchange } from "@/lib/assistant/client-state";
import type { AssistantHistoryTurn, AssistantResult } from "@/lib/assistant/types";
const ACTIVE_KEY="ev.saved-conversation.v1";
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Conversation={id:string;app:"ev";created_at:string;expires_at:string};
type Reply={result?:AssistantResult;saved?:boolean;receipt?:string;error?:string;pending?:boolean};
async function call(path:string,body?:unknown,signal?:AbortSignal,deadlineMs?:number){
  const response=await fetch(path,{method:body===undefined?"GET":"POST",headers:body===undefined?undefined:{"Content-Type":"application/json",...(deadlineMs===undefined?{}:{"X-EV-Deadline-Ms":String(deadlineMs)})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",signal:signal??AbortSignal.timeout(8000)});
  const data:unknown=await response.json();
  if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Saved chat is unavailable.");
  return {response,data:data as Record<string,unknown>};
}
function remembered(id:string|null){try{if(id)sessionStorage.setItem(ACTIVE_KEY,id);else sessionStorage.removeItem(ACTIVE_KEY);}catch{/* Choosing a chat again remains available without tab storage. */}}
export function useConversationStorage(enabled:boolean,open:boolean,replace:(exchanges:readonly AssistantExchange[])=>void){
  const [connected,setConnected]=useState(false),[checking,setChecking]=useState(enabled),[busy,setBusy]=useState(false);
  const [currentId,setCurrentId]=useState<string|null>(null),[conversations,setConversations]=useState<Conversation[]>([]);
  const [captchaSiteKey,setCaptchaSiteKey]=useState<string|null>(null);
  const acting=useRef(false);
  const [notice,setNotice]=useState(""),[receipts,setReceipts]=useState<{token:string;conversationId:string}[]>([]);
  const current=useRef<string|null>(null),identityReady=useRef(false),mounted=useRef(true),pendingCreation=useRef<string|null>(null);
  const replaceRef=useRef(replace);useEffect(()=>{replaceRef.current=replace;},[replace]);
  const selectId=useCallback((id:string|null)=>{current.current=id;pendingCreation.current=null;setCurrentId(id);remembered(id);},[]);
  const list=useCallback(async()=>{
    const {response,data}=await call("/api/conversations?app=ev");
    if(!response.ok||!Array.isArray(data.conversations)||data.conversations.length>12||!data.conversations.every(c=>c&&typeof c==="object"&&uuid.test(c.id)&&c.app==="ev"&&Number.isFinite(Date.parse(c.created_at))&&Number.isFinite(Date.parse(c.expires_at))))throw new Error("Saved chats could not be read.");
    const rows=data.conversations as Conversation[];if(mounted.current)setConversations(rows);return rows;
  },[]);
  const load=useCallback(async(id:string)=>{
    if(!uuid.test(id))return;
    const {response,data}=await call(`/api/conversations?conversationId=${id}`);
    if(!response.ok||!Array.isArray(data.messages)||data.messages.length>160)throw new Error("This saved chat could not be read.");
    const exchanges:AssistantExchange[]=[];
    for(const message of data.messages){
      if(!message||typeof message!=="object"||message.conversation_id!==id||!uuid.test(message.request_id)||typeof message.body!=="string")throw new Error("This saved chat could not be read.");
      if(message.role==="user"){
        if(message.body.length>280)throw new Error("This older chat cannot be resumed in the current panel.");
        const answer=data.messages.find(m=>m&&m.role==="assistant"&&m.request_id===message.request_id);
        const result=answer?parseAssistantResult(answer.result):null;
        if(answer&&!result)throw new Error("This older reply has no resumable source record.");
        exchanges.push({id:exchanges.length,question:message.body,result});
      }
    }
    if(mounted.current){selectId(id);replaceRef.current(exchanges.slice(-20));setNotice(exchanges.some(e=>e.result===null)?"A saved question has no completed reply. It has not been sent to the model again.":"Saved chat restored.");}
  },[selectId]);
  useEffect(()=>{
    mounted.current=true;return()=>{mounted.current=false;};
  },[]);
  useEffect(()=>{
    if(!enabled||!open||identityReady.current)return;
    identityReady.current=true;
    void(async()=>{
      try{
        const {response,data}=await call("/api/conversation-session");
        if(!response.ok)throw new Error("Saved chat connection is unavailable. Your current chat stays in this tab.");
        if(!mounted.current)return;
        setCaptchaSiteKey(typeof data.captchaSiteKey==="string"&&/^[a-zA-Z0-9_-]{10,100}$/.test(data.captchaSiteKey)?data.captchaSiteKey:null);
        setConnected(data.status==="connected");
        if(data.status==="connected"){
          const rows=await list();let saved:string|null=null;try{saved=sessionStorage.getItem(ACTIVE_KEY);}catch{}
          if(saved&&rows.some(c=>c.id===saved))await load(saved);
        }
      }catch(error){if(mounted.current)setNotice(error instanceof Error?error.message:"Saved chats are unavailable.");}
      finally{if(mounted.current)setChecking(false);}
    })();
  },[enabled,open,list,load]);
  async function act(operation:()=>Promise<void>){if(acting.current)return;acting.current=true;setBusy(true);setNotice("");try{await operation();}catch(error){setNotice(error instanceof Error?error.message:"Saved chat action failed.");}finally{acting.current=false;setBusy(false);}}
  async function ensureSession(signal?:AbortSignal){
    const {response,data}=await call("/api/conversation-session",undefined,signal);
    if(!response.ok||data.status!=="connected")throw new Error("Reconnect before saving another message. This question was not sent to the model.");
  }
  return {
    connected,checking,busy,captchaSiteKey,currentId,conversations,notice,unsaved:receipts.length,
    connect:(captchaToken:string)=>act(async()=>{
      const {response,data}=await call("/api/conversation-session",{action:"connect",consent:"30-day-storage-v1",captchaToken});
      if(!response.ok||data.status!=="connected")throw new Error("The saved chat connection could not be created. Try again later.");
      setConnected(true);selectId(null);replaceRef.current([]);await list();setNotice("New messages will be saved for 30 days. Start your new chat below.");
    }),
    select:(id:string)=>act(()=>load(id)),
    startNew:()=>{selectId(null);replaceRef.current([]);setNotice("New saved chat. Your earlier saved chats remain in the list.");},
    remove:()=>act(async()=>{
      if(!current.current)return;
      await ensureSession();const {response,data}=await call("/api/conversations",{action:"delete",conversationId:current.current});
      if(!response.ok||typeof data.deleted!=="boolean")throw new Error("Deletion was not confirmed. Your chat is still visible here.");
      const removed=current.current;setReceipts(items=>items.filter(item=>item.conversationId!==removed));
      selectId(null);replaceRef.current([]);await list();setNotice(data.deleted?"Saved chat deleted.":"That saved chat is already unavailable.");
    }),
    disconnect:()=>act(async()=>{
      const {response,data}=await call("/api/conversation-session",{action:"disconnect"});
      if(!response.ok||data.status!=="disconnected")throw new Error("Disconnect was not confirmed. Try again before leaving a shared computer.");
      setCaptchaSiteKey(typeof data.captchaSiteKey==="string"&&/^[a-zA-Z0-9_-]{10,100}$/.test(data.captchaSiteKey)?data.captchaSiteKey:null);
      setConnected(false);selectId(null);setConversations([]);setReceipts([]);setNotice("Disconnected. This tab keeps the visible chat; its saved copy expires after 30 days. It cannot be recovered after disconnecting a guest identity.");
    }),
    retrySaving:()=>act(async()=>{
      await ensureSession();let savedCount=0;
      for(const receipt of receipts){const {response,data}=await call("/api/conversations/ask",{action:"save",receipt:receipt.token});if(!response.ok||data.saved!==true)break;savedCount++;}
      setReceipts(current=>current.slice(savedCount));setNotice(savedCount===receipts.length?"Replies saved without asking the model again.":"Some replies are still unsaved. Keep this page open or copy their text.");
    }),
    async ask(question:string,history:readonly AssistantHistoryTurn[],signal:AbortSignal):Promise<AssistantResult>{
      const started=performance.now();
      await ensureSession(signal);
      if(!current.current){
        const id=pendingCreation.current??crypto.randomUUID();pendingCreation.current=id;const {response,data}=await call("/api/conversations",{action:"create",id,app:"ev"},signal);
        if(!response.ok||data.id!==id||data.saved!==true)throw new Error("A saved chat could not be created. Your question was not sent to the model.");selectId(id);
      }
      const requestId=crypto.randomUUID();
      const {response,data}=await call("/api/conversations/ask",{action:"ask",question,history,conversationId:current.current,requestId},signal,Math.max(1,Math.floor(9000-(performance.now()-started))));
      const reply=data as Reply,result=parseAssistantResult(reply.result);
      if(!response.ok||!result){setNotice(reply.pending?"This question already started. Check saved chats for its reply; no second model request was made.":"This reply could not be confirmed. Check saved chats before asking again.");return {state:"unavailable"};}
      if(reply.saved!==true){
        if(typeof reply.receipt==="string"&&reply.receipt.length<=48000)setReceipts(items=>[...items,{token:reply.receipt!,conversationId:current.current!}].slice(-20));
        setNotice("Reply not saved online. Retry saving before leaving this page; your visible reply stays in this tab.");
      }else setNotice("Chat saved for 30 days.");
      void list().catch(()=>undefined);
      return result;
    },
    failed:()=>setNotice("The request was interrupted. Check saved chats for its reply before asking again."),
  };
}
export type ConversationStorage=ReturnType<typeof useConversationStorage>;
