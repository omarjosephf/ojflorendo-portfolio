import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import corpus from "@/data/management-corpus.generated.json";
import type { CorpusChunk, CorpusSnapshot } from "@/lib/management/types";
import { ragCostInputs } from "@/lib/management/rag-cost";
import { RagConfiguration } from "./RagViews";
import { ManagementWorkspace } from "./ManagementWorkspace";
vi.mock("@/components/theme/ThemeSelect",()=>({ThemeSelect:()=>null}));
const snapshot=corpus as CorpusSnapshot;
function metric(label:string){return screen.getByRole("heading",{name:label}).closest("section")?.querySelector("strong")?.textContent;}
function chunk(index:number,tokens:number):CorpusChunk{return{index,source:"synthetic.md",section:null,page:null,text:"Synthetic chunk text.",tokens,indexedSha256:`synthetic-${index}`};}

it("renders the committed target, overlap and model values",()=>{
  render(<RagConfiguration corpus={snapshot}/>);
  expect(metric("Target words per chunk")).toBe("180");expect(metric("Overlap words")).toBe("40");
  expect(screen.getByText("BAAI/bge-small-en-v1.5")).toBeInTheDocument();expect(screen.getByText("512 tokens per chunk")).toBeInTheDocument();
  expect(screen.getByText(snapshot.tokenizerSha256)).toBeInTheDocument();expect(screen.getByText(snapshot.corpusSha256)).toBeInTheDocument();
  expect(screen.getByText("180-word target")).toBeInTheDocument();expect(screen.getByText("40-word overlap")).toBeInTheDocument();
});
it("derives the chunk statistics from the snapshot rather than from literals",()=>{
  const tokens=snapshot.chunks.map((c)=>c.tokens);const largest=Math.max(...tokens);const mean=Math.round(tokens.reduce((sum,t)=>sum+t,0)/tokens.length);const over=tokens.filter((t)=>t>snapshot.tokenLimit).length;
  render(<RagConfiguration corpus={snapshot}/>);
  expect(metric("Resulting chunks")).toBe(String(snapshot.chunks.length));expect(metric("Largest chunk")).toBe(String(largest));
  expect(screen.getByText(`${largest} tokens in the largest chunk`)).toBeInTheDocument();expect(screen.getByText(new RegExp(`The mean chunk is ${mean} tokens`))).toBeInTheDocument();
  expect(screen.getByText(`${over} chunks exceed the ${snapshot.tokenLimit}-token limit`)).toBeInTheDocument();expect(screen.getByText(`${over} over the limit`)).toBeInTheDocument();
});
it("counts and flags chunks over the limit when a snapshot has them",()=>{
  render(<RagConfiguration corpus={{...snapshot,tokenLimit:100,chunks:[chunk(0,90),chunk(1,120),chunk(2,60)]}}/>);
  expect(metric("Resulting chunks")).toBe("3");expect(metric("Largest chunk")).toBe("120");expect(screen.getByText("1 chunk exceeds the 100-token limit")).toBeInTheDocument();
  expect(screen.getByText(/Re-chunk with a smaller target/)).toBeInTheDocument();expect(screen.queryByText(/Every chunk here is embedded whole/)).toBeNull();
});
it("states that the cost figures are stale and computes the figure from the constants",()=>{
  render(<RagConfiguration corpus={snapshot}/>);
  expect(ragCostInputs.verifiedOn).toBe("2026-08-28");expect(ragCostInputs.model).toBe("claude-haiku-4-5");
  expect(screen.getByRole("note")).toHaveTextContent("Last verified on 28 August 2026 against claude-haiku-4-5, which is no longer the deployed model.");
  expect(screen.getByRole("note")).toHaveTextContent("has run on gemini-3.5-flash-lite since 13 September 2026");
  expect(metric("Per answered question")).toBe("$0.0045");expect(metric("Input rate")).toBe("$1.00");expect(metric("Output rate")).toBe("$5.00");expect(metric("Retrieved passages")).toBe("4");
  expect(screen.getByText("2500 tokens × $1.00 / 1M = $0.0025")).toBeInTheDocument();expect(screen.getByText("400 tokens × $5.00 / 1M = $0.0020")).toBeInTheDocument();expect(screen.getByText("1024 output tokens")).toBeInTheDocument();
  expect(screen.getByText("docs/assistant-service-costs.md")).toBeInTheDocument();
});
it("is the seventh section of the workspace and opens from the navigation",()=>{
  render(<ManagementWorkspace corpus={snapshot} initialStore={null} initialError=""/>);
  const nav=within(screen.getByRole("navigation",{name:"Management sections"}));
  expect(nav.getAllByRole("button").map((b)=>b.textContent?.replace(/\d+$/,""))).toEqual(["Overview","Conversations","Questions & gaps","Knowledge drafts","Sources & chunks","Quality & operations","RAG configuration"]);
  fireEvent.click(nav.getByRole("button",{name:"RAG configuration"}));
  expect(screen.getByRole("heading",{level:1})).toHaveTextContent("RAG configuration");expect(screen.getByText("See how retrieval is configured and what an answer costs.")).toBeInTheDocument();
  expect(screen.getByRole("heading",{name:"Chunking"})).toBeInTheDocument();expect(screen.getByRole("heading",{name:"Embedding model"})).toBeInTheDocument();expect(screen.getByRole("note")).toBeInTheDocument();
  fireEvent.click(nav.getByRole("button",{name:"Sources & chunks"}));expect(screen.getByRole("heading",{name:"Source library"})).toBeInTheDocument();expect(screen.queryByRole("note")).toBeNull();
});
