import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import corpus from "@/data/management-corpus.generated.json";
import { isRagSnapshot, ragSnapshot } from "@/lib/management/rag-snapshot";
import type { CorpusSnapshot } from "@/lib/management/types";
import { LiveOwnerWorkspace } from "./LiveOwnerWorkspace";
vi.mock("@/components/theme/ThemeSelect",()=>({ThemeSelect:()=>null}));
afterEach(()=>vi.unstubAllGlobals());
const snapshot=ragSnapshot(corpus as CorpusSnapshot);
function fixture(rag:()=>Response){
  const fetcher=vi.fn<(input:unknown,init?:RequestInit)=>Promise<Response>>(async(input)=>{const url=String(input);
    if(url.includes("view=rag"))return rag();
    if(url.startsWith("/api/management/owner"))return Response.json({status:"ready",factorId:"10000000-0000-4000-8000-000000000001"});
    return Response.json({error:"Synthetic fixture: not used"},{status:503});});
  vi.stubGlobal("fetch",fetcher);return fetcher;
}
it("strips chunk text from the RAG snapshot and validates its shape",()=>{
  expect(snapshot.chunks.length).toBe((corpus as CorpusSnapshot).chunks.length);
  expect(snapshot.chunks.every(c=>Object.keys(c).join()==="tokens")).toBe(true);
  expect(isRagSnapshot(snapshot)).toBe(true);
  for(const bad of [null,{},{...snapshot,chunks:[]},{...snapshot,chunks:[{tokens:-1}]},{...snapshot,targetWords:"180"},{...snapshot,generatedAt:"not a date"},{...snapshot,schemaVersion:2}])expect(isRagSnapshot(bad)).toBe(false);
});
it("opens on the E.V section and switches to a read-only Blog section",async()=>{
  const fetcher=fixture(()=>Response.json({rag:snapshot}));
  render(<LiveOwnerWorkspace preview={false}/>);
  expect(await screen.findByRole("heading",{level:1,name:"E.V assistant"})).toBeInTheDocument();
  const nav=screen.getByRole("navigation",{name:"Admin sections"});
  expect(within(nav).getByRole("button",{name:"E.V assistant"})).toHaveAttribute("aria-current","true");
  fireEvent.click(within(nav).getByRole("button",{name:"Blog agents"}));
  expect(screen.getByRole("heading",{level:1,name:"Blog agents"})).toBeInTheDocument();
  expect(screen.getByText("Owner-run")).toBeInTheDocument();expect(screen.getByRole("heading",{name:"This panel will never"})).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Refresh conversations"})).toBeNull();
  expect(fetcher.mock.calls.some(call=>String(call[0]).includes("view=rag"))).toBe(false);
  expect(fetcher.mock.calls.every(call=>!call[1]?.body)).toBe(true);
});
it("loads the RAG configuration only on request, from the owner API",async()=>{
  const fetcher=fixture(()=>Response.json({rag:snapshot}));
  render(<LiveOwnerWorkspace preview={false}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Show RAG configuration"}));
  expect(await screen.findByRole("heading",{name:"Target words per chunk"})).toBeInTheDocument();
  expect(fetcher.mock.calls.filter(call=>String(call[0])==="/api/management/owner?view=rag")).toHaveLength(1);
});
it("shows nothing rather than an unverified RAG response",async()=>{
  fixture(()=>Response.json({status:"ready"}));
  render(<LiveOwnerWorkspace preview={false}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Show RAG configuration"}));
  expect(await screen.findByText(/could not be verified/)).toBeInTheDocument();
  expect(screen.queryByRole("heading",{name:"Target words per chunk"})).toBeNull();
});
it("returns to sign-in and clears the RAG view when the owner session is refused",async()=>{
  fixture(()=>Response.json({error:"Owner sign-in and current authenticator verification are required."},{status:401}));
  render(<LiveOwnerWorkspace preview={false}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Show RAG configuration"}));
  expect(await screen.findByRole("heading",{name:"Owner sign-in"})).toBeInTheDocument();
  expect(screen.queryByRole("navigation",{name:"Admin sections"})).toBeNull();
});
it("keeps the E.V section mounted while the Blog section is shown, so unsaved work survives",async()=>{
  fixture(()=>Response.json({rag:snapshot}));
  render(<LiveOwnerWorkspace preview={false}/>);
  const refresh=await screen.findByRole("button",{name:"Refresh conversations"});
  fireEvent.click(within(screen.getByRole("navigation",{name:"Admin sections"})).getByRole("button",{name:"Blog agents"}));
  expect(refresh).toBeInTheDocument();expect(refresh.closest("[hidden]")).not.toBeNull();
  fireEvent.click(within(screen.getByRole("navigation",{name:"Admin sections"})).getByRole("button",{name:"E.V assistant"}));
  expect(screen.getByRole("button",{name:"Refresh conversations"})).toBe(refresh);
});
