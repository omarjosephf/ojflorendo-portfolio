"use client";
import { useRef, useState } from "react";
import { TurnstileWidget } from "@/components/sections/TurnstileWidget";
const button="min-h-11 rounded-[3px] border border-line px-3 py-2 text-xs font-medium text-ink hover:bg-surface-2 disabled:opacity-50";
export function SavedChatSignup({siteKey,nonce,disabled,connect}:{siteKey:string|null;nonce?:string;disabled:boolean;connect:(token:string)=>Promise<void>}) {
  const [started,setStarted]=useState(false),[token,setToken]=useState(""),[reset,setReset]=useState(0);
  const active=useRef(false);
  if(!siteKey)return <p>New saved chats are temporarily unavailable. You can keep chatting in this tab.</p>;
  if(!started)return <button className={button} disabled={disabled} onClick={()=>setStarted(true)}>Start a new saved chat</button>;
  return <div>
    <p>Complete the verification check to start saving new messages.</p>
    <TurnstileWidget siteKey={siteKey} nonce={nonce} theme="auto" onToken={setToken} resetSignal={reset} failureMessage="Verification couldn’t load. Reload to try again, or continue chatting in this tab."/>
    <div className="mt-2 flex flex-wrap gap-2">
      <button className={button} disabled={disabled||!token} onClick={()=>{
        if(disabled||!token||active.current)return;
        active.current=true;const fresh=token;setToken("");
        void connect(fresh).finally(()=>{active.current=false;setToken("");setReset(value=>value+1);});
      }}>Verify and start saved chat</button>
      <button className={button} disabled={disabled} onClick={()=>{setToken("");setStarted(false);setReset(0);}}>Cancel</button>
    </div>
  </div>;
}
