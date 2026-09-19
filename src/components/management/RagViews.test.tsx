import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import corpus from "@/data/management-corpus.generated.json";
import type { CorpusChunk, CorpusSnapshot } from "@/lib/management/types";
import { answersAdmittedPerMonth, costIsStale, ragCostInputs, type RagCostInputs } from "@/lib/management/rag-cost";
import { RagConfiguration } from "./RagViews";
import { ManagementWorkspace } from "./ManagementWorkspace";
vi.mock("@/components/theme/ThemeSelect",()=>({ThemeSelect:()=>null}));
const snapshot=corpus as CorpusSnapshot;
function metric(label:string){return screen.getByRole("heading",{name:label}).closest("section")?.querySelector("strong")?.textContent;}
function chunk(index:number,tokens:number):CorpusChunk{return{index,source:"synthetic.md",section:null,page:null,text:"Synthetic chunk text.",tokens,indexedSha256:`synthetic-${index}`};}
// Dates deliberately unlike the real ones, so a test cannot pass because the
// literal happens to match today's constants. The stale fixture is verified
// before its runtime shipped; the current fixture after.
const stale:RagCostInputs={...ragCostInputs,model:"synthetic-superseded-model",verifiedOn:"2031-01-05",runtimeDeployedOn:"2031-04-09"};
const current:RagCostInputs={...ragCostInputs,model:"synthetic-live-model",verifiedOn:"2031-04-11",runtimeDeployedOn:"2031-04-09"};

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
it("derives staleness and the admitted answer count from the constants",()=>{
  expect(costIsStale(stale)).toBe(true);expect(costIsStale(current)).toBe(false);
  expect(costIsStale(ragCostInputs)).toBe(false);expect(ragCostInputs.verifiedOn>=ragCostInputs.runtimeDeployedOn).toBe(true);
  expect(answersAdmittedPerMonth({...ragCostInputs,monthlyReservationCeilingUsd:2,reservationUsdPerAttempt:0.04,monthlyAttemptCeiling:200})).toBe(50);
  expect(answersAdmittedPerMonth({...ragCostInputs,monthlyReservationCeilingUsd:100,reservationUsdPerAttempt:0.04,monthlyAttemptCeiling:200})).toBe(200);
});
it("warns when the figures predate the deployed runtime",()=>{
  render(<RagConfiguration corpus={snapshot} cost={stale}/>);
  expect(screen.getByRole("note")).toHaveTextContent("Last verified on 5 January 2031 against synthetic-superseded-model, before the runtime deployed on 9 April 2031.");
  expect(screen.getByRole("note")).toHaveTextContent("this is not a current price");
  expect(screen.getByText("COST FIGURES ARE STALE")).toBeInTheDocument();expect(screen.getByText("Stale")).toBeInTheDocument();
});
it("says the figures are current when they were verified after the runtime shipped",()=>{
  render(<RagConfiguration corpus={snapshot} cost={current}/>);
  expect(screen.getByRole("note")).toHaveTextContent("Verified on 11 April 2031 against synthetic-live-model, the runtime deployed on 9 April 2031.");
  expect(screen.getByText("COST FIGURES VERIFIED")).toBeInTheDocument();expect(screen.getByText("Current")).toBeInTheDocument();
  expect(screen.queryByText("COST FIGURES ARE STALE")).toBeNull();
});
it("shows the measured cost, the reservation that bounds it, and the sample it rests on",()=>{
  render(<RagConfiguration corpus={snapshot}/>);
  expect(ragCostInputs.model).toBe("gemini-3.5-flash-lite");expect(ragCostInputs.source).toBe("docs/assistant-service-costs.md");
  expect(metric("Per answered question")).toBe("$0.0024");expect(metric("Reserved per attempt")).toBe("$0.04");
  expect(metric("Answers admitted a month")).toBe("50");expect(metric("Retrieved passages")).toBe("4");
  expect(screen.getByText("$0.30 per 1M tokens")).toBeInTheDocument();expect(screen.getByText("$2.50 per 1M tokens, thinking included")).toBeInTheDocument();
  expect(screen.getByText("$0.0021 – $0.0027, typical $0.0024")).toBeInTheDocument();expect(screen.getByText("6 calls over 1 question on 2026-09-12")).toBeInTheDocument();
  expect(screen.getByText(/The honest limit of this figure is its sample: 6 calls of 1 question/)).toBeInTheDocument();
  expect(screen.getByText(/stops answering at 50 answers a month/)).toBeInTheDocument();
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
