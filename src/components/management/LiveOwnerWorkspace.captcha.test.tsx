import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LiveOwnerWorkspace } from "./LiveOwnerWorkspace";
type Props={onToken:(token:string)=>void;resetSignal:number;nonce?:string};
const widget=vi.hoisted(()=>({props:null as Props|null}));
vi.mock("@/components/sections/TurnstileWidget",()=>({TurnstileWidget:(props:Props)=>{widget.props=props;return <span>Verification fixture</span>;}}));
beforeEach(()=>{widget.props=null;});afterEach(()=>vi.unstubAllGlobals());
function fixture(reject=false,siteKey:string|null="0xTEST_AUTH_KEY"){
  const fetcher=vi.fn(async(_input:unknown,init?:RequestInit)=>init?.body?(reject?Response.json({error:"Synthetic verification rejection",authCaptcha:{required:true,siteKey}},{status:401}):Response.json({status:"mfa_required",factorId:"10000000-0000-4000-8000-000000000001"})):Response.json({status:"signed_out",authCaptcha:{required:true,siteKey}}));vi.stubGlobal("fetch",fetcher);return fetcher;
}
async function begin(){render(<LiveOwnerWorkspace nonce="synthetic-owner-nonce"/>);await screen.findByRole("heading",{name:"Owner sign-in"});fireEvent.change(screen.getByLabelText("Email"),{target:{value:"owner@example.test"}});fireEvent.change(screen.getByLabelText("Password"),{target:{value:"synthetic-password"}});}
it("requires a fresh token alongside the password, then still asks for the authenticator",async()=>{
  const fetcher=fixture();await begin();const button=screen.getByRole("button",{name:"Sign in"});expect(button).toBeDisabled();expect(widget.props?.nonce).toBe("synthetic-owner-nonce");
  act(()=>widget.props?.onToken("synthetic-owner-token"));fireEvent.click(button);await screen.findByRole("heading",{name:"Verify your authenticator"});expect(screen.queryByText("Owner verified · Authenticator required")).toBeNull();expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetcher.mock.calls[1][1]?.body as string).captchaToken).toBe("synthetic-owner-token");expect(document.body.textContent).not.toContain("synthetic-owner-token");
});
it("requires fresh verification after an uncertain or rejected password attempt",async()=>{
  fixture(true);await begin();act(()=>widget.props?.onToken("synthetic-old-token"));fireEvent.click(screen.getByRole("button",{name:"Sign in"}));await screen.findByText("Synthetic verification rejection");expect(screen.getByRole("button",{name:"Sign in"})).toBeDisabled();expect(screen.getByLabelText("Password")).toHaveValue("");await waitFor(()=>expect(widget.props?.resetSignal).toBe(1));
});
it("disables sign-in if required verification is misconfigured",async()=>{
  fixture(false,null);await begin();expect(screen.getByRole("button",{name:"Sign in"})).toBeDisabled();expect(widget.props).toBeNull();await screen.findByText(/Owner verification is temporarily unavailable/);
});

it("labels the deployed owner view clearly and hides sample navigation",async()=>{
  fixture();render(<LiveOwnerWorkspace preview={false}/>);await screen.findByRole("heading",{name:"Owner sign-in"});expect(screen.queryByRole("link",{name:"Sample workspace"})).toBeNull();expect(screen.getByText("PRIVATE WORKSPACE")).toBeInTheDocument();expect(screen.getByText("Private workspace · Owner access only")).toBeInTheDocument();
});
