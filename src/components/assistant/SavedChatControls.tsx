"use client";
import { SavedChatSignup } from "./SavedChatSignup";
import type { ConversationStorage } from "./useConversationStorage";
const button="min-h-11 rounded-[3px] border border-line px-3 py-2 text-xs font-medium text-ink hover:bg-surface-2 disabled:opacity-50";
export function SavedChatControls({storage,disabled,nonce}:{storage:ConversationStorage;disabled:boolean;nonce?:string}){
  const locked=disabled||storage.busy||storage.checking;
  return <div className="space-y-2 border-b border-line bg-surface-2/40 px-4 py-3 text-xs leading-5 text-muted">
    {!storage.connected?<>
      <p>Saved chats stay on the server for 30 days and can be reviewed by OJ to improve answers. Use this browser to return to them. Avoid private or sensitive information.</p>
      <SavedChatSignup siteKey={storage.captchaSiteKey} nonce={nonce} disabled={locked} connect={storage.connect}/>
      <p>Your current chat stays in this tab unless you start a saved chat.</p>
    </>:<>
      <label className="block font-medium text-ink" htmlFor="ev-saved-chat-select">Saved chats</label>
      <select id="ev-saved-chat-select" aria-label="Saved chats" value={storage.currentId??""} disabled={locked} onChange={event=>{if(event.target.value)void storage.select(event.target.value);else storage.startNew();}} className="min-h-11 w-full rounded-[3px] border border-line bg-surface px-2 text-ink">
        <option value="">New saved chat</option>
        {storage.conversations.map((chat,index)=><option key={chat.id} value={chat.id}>{new Date(chat.created_at).toLocaleString(undefined,{dateStyle:"short",timeStyle:"short"})} · Chat {storage.conversations.length-index}</option>)}
      </select>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={locked} onClick={storage.startNew}>New chat</button>
        <button className={button} disabled={locked||!storage.currentId} onClick={()=>void storage.remove()}>Delete saved chat</button>
        <button className={button} disabled={locked} onClick={()=>void storage.disconnect()}>Disconnect</button>
      </div>
      <p>Saved for 30 days. Disconnecting loses this guest account&rsquo;s access; delete saved chats first if you want them removed now.</p>
    </>}
    {storage.unsaved>0&&<button className={button} disabled={locked} onClick={()=>void storage.retrySaving()}>Retry saving {storage.unsaved} {storage.unsaved===1?"reply":"replies"}</button>}
    {storage.notice&&<p role="status">{storage.notice}</p>}
  </div>;
}
