/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { askAssistantService } from "./service";
import { parseAnswerEvent } from "./answer-event";
const event={version:1,outcome:"answered",route:"primary",model:"synthetic-model",retrieved:["project-cited.md"],cited:["project-cited.md"],latencyMs:123,corpusSha256:"a".repeat(64),promptSha256:"b".repeat(64)};
const body={version:3,state:"answered",answer:"OJ built Cited.",citations:[{source_id:"project-cited.md",evidence_id:"a".repeat(64),quote:"OJ built Cited"}],model_route:"primary"};
const config={url:"https://backend.example",secret:"synthetic-secret"};
afterEach(()=>vi.unstubAllGlobals());
async function observe(value:unknown=event,responseBody:unknown=body){
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json(responseBody,{headers:{"X-Assistant-Event":Buffer.from(JSON.stringify(value)).toString("base64url")}}));vi.stubGlobal("fetch",fetcher);
 const onEvent=vi.fn();const result=await askAssistantService("A question?",config,[],{onEvent});return {result,onEvent,fetcher};
}
describe("trusted answer observations",()=>{
 it("keeps diagnostics separate from the visitor result",async()=>{const {result,onEvent,fetcher}=await observe();expect(result.state).toBe("answered");expect(result).not.toHaveProperty("event");expect(result).not.toHaveProperty("model");expect(onEvent).toHaveBeenCalledWith(event);expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("X-Assistant-Event")).toBe("1");});
 it.each([{...event,retrieved:["private.txt"]},{...event,route:"fallback"},{...event,latencyMs:-1},{...event,corpusSha256:"unknown"},{...event,extra:"untrusted"},{...event,cited:[]},{...event,model:null}])("discards invalid or mismatched telemetry without losing the reply",async value=>{const {result,onEvent}=await observe(value);expect(result.state).toBe("answered");expect(onEvent).not.toHaveBeenCalled();});
 it("does not forward an unrecognized source even when structurally valid",async()=>{const {onEvent}=await observe({...event,retrieved:[...event.retrieved,"not-in-corpus.md"]});expect(onEvent).not.toHaveBeenCalled();});
 it("does not turn unsupported into a policy diagnosis",async()=>{const {onEvent}=await observe({...event,outcome:"policy_boundary",cited:[]},{version:3,state:"not-covered",policy:"unsupported",model_route:"primary"});expect(onEvent).not.toHaveBeenCalled();});
 it("rejects unknown event schemas",()=>{expect(parseAnswerEvent({...event,version:2})).toBeNull();});
});
