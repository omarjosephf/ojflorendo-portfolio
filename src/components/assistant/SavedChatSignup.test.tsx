import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SavedChatControls } from "./SavedChatControls";
import { useConversationStorage } from "./useConversationStorage";
type Props={onToken:(token:string)=>void;resetSignal:number;nonce?:string};
const widget=vi.hoisted(()=>({props:null as Props|null}));
vi.mock("@/components/sections/TurnstileWidget",()=>({TurnstileWidget:(props:Props)=>{widget.props=props;return <span>Verification fixture</span>;}}));
const replace=vi.fn();
function Harness(){const storage=useConversationStorage(true,true,replace);return <SavedChatControls storage={storage} disabled={false} nonce="synthetic-nonce"/>;}
beforeEach(()=>{widget.props=null;sessionStorage.clear();});
afterEach(()=>vi.unstubAllGlobals());
function fixture(siteKey:string|null="0xTEST_AUTH_KEY",reject=false){
  let posts=0;
  const fetcher=vi.fn(async(input:string,init?:RequestInit)=>{
    if(input==="/api/conversation-session"){
      if(!init?.body)return Response.json({status:"disconnected",captchaSiteKey:siteKey});
      posts++;return reject?Response.json({error:"Synthetic verification rejection"},{status:401}):Response.json({status:"connected"});
    }
    return Response.json({conversations:[]});
  });vi.stubGlobal("fetch",fetcher);return {fetcher,posts:()=>posts};
}
async function begin(){render(<Harness/>);const button=await screen.findByRole("button",{name:"Start a new saved chat"});await waitFor(()=>expect(button).toBeEnabled());expect(widget.props).toBeNull();fireEvent.click(button);}
it("loads verification only after consent and forwards one token without replacing the current chat early",async()=>{
  const state=fixture();await begin();const submit=screen.getByRole("button",{name:"Verify and start saved chat"});expect(submit).toBeDisabled();expect(replace).not.toHaveBeenCalled();expect(state.posts()).toBe(0);expect(widget.props?.nonce).toBe("synthetic-nonce");
  act(()=>widget.props?.onToken("synthetic-fresh-token"));expect(submit).toBeEnabled();fireEvent.click(submit);fireEvent.click(submit);
  await screen.findByText(/New messages will be saved/);expect(state.posts()).toBe(1);expect(replace).toHaveBeenCalledWith([]);
  expect(JSON.parse(state.fetcher.mock.calls.find(([,init])=>init?.body)?.[1]?.body as string).captchaToken).toBe("synthetic-fresh-token");expect(document.body.textContent).not.toContain("synthetic-fresh-token");
});
it("drops expired/spent tokens and preserves tab chat when verification is rejected",async()=>{
  const state=fixture(undefined,true);await begin();const submit=screen.getByRole("button",{name:"Verify and start saved chat"});
  act(()=>widget.props?.onToken("synthetic-expiring-token"));act(()=>widget.props?.onToken(""));expect(submit).toBeDisabled();
  act(()=>widget.props?.onToken("synthetic-rejected-token"));fireEvent.click(submit);await screen.findByText(/connection could not be created/);expect(submit).toBeDisabled();expect(widget.props?.resetSignal).toBe(1);expect(replace).not.toHaveBeenCalled();
  act(()=>widget.props?.onToken("synthetic-replacement-token"));fireEvent.click(submit);await waitFor(()=>expect(widget.props?.resetSignal).toBe(2));expect(state.posts()).toBe(2);
});
it("keeps ordinary chat available when signup protection is not configured",async()=>{
  const state=fixture(null);render(<Harness/>);await screen.findByText(/New saved chats are temporarily unavailable/);expect(screen.queryByRole("button",{name:"Start a new saved chat"})).toBeNull();expect(state.posts()).toBe(0);expect(widget.props).toBeNull();
});
it("cancels verification without creating an identity and discards the old token",async()=>{
  const state=fixture();await begin();act(()=>widget.props?.onToken("synthetic-unused-token"));fireEvent.click(screen.getByRole("button",{name:"Cancel"}));fireEvent.click(screen.getByRole("button",{name:"Start a new saved chat"}));expect(screen.getByRole("button",{name:"Verify and start saved chat"})).toBeDisabled();expect(state.posts()).toBe(0);
});
