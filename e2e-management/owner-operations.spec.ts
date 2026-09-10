import {test,expect,type Page} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id="10000000-0000-4000-8000-000000000001";
const report={days:7,asOf:"2026-09-09T00:00:00Z",from:"2026-09-02T00:00:00Z",truncated:true,questions:1000,conversations:50,replies:900,events:20,feedback:10,helpful:7,topQuestions:[{question:"What services does OJ offer?",count:4,shortened:false}],sources:[{source:"services.md",citations:8}],outcomes:{answered:20}};
async function setup(page:Page){
 await page.route("**/api/**",r=>r.abort()); // All APIs fail closed unless explicitly mocked below.
 let draft:Record<string,unknown>|null=null,failSave=false,conflict=false;const requests:string[]=[];const receipts=new Map();
 await page.route("**/api/management/owner**",r=>r.fulfill({json:{status:"ready",factorId:id}}));
 await page.route("**/api/management/operations**",async r=>{
  const q=new URL(r.request().url()).searchParams;
  if(r.request().method()==="POST"){
   const d=r.request().postDataJSON();requests.push(d.requestId);
   if(conflict){await r.fulfill({status:409,json:{error:"This draft changed. Keep your text and check the saved version."}});return;}
   if(!receipts.has(d.requestId)){draft={...d,revision:d.revision+1,updated_at:"2026-09-09T00:00:00Z"};receipts.set(d.requestId,{id:d.id,revision:d.revision+1});}
   if(failSave){failSave=false;await r.fulfill({status:503,json:{error:"The operation could not be confirmed. Keep your text and retry."}});return;}
   await r.fulfill({json:{saved:receipts.get(d.requestId)}});return;
  }
  if(q.get("view")==="report"){await r.fulfill({json:{report:{...report,days:Number(q.get("days"))}}});return;}
  if(q.get("view")==="drafts"){await r.fulfill({json:{drafts:draft?[draft]:[]}});return;}
  if(q.get("view")==="draft"){await r.fulfill({json:{draft}});return;}
  await r.fulfill({json:{history:[]}});
 });
 return {requests,failNext:()=>{failSave=true;},conflict:()=>{conflict=true;},revoke:async()=>{await page.unroute("**/api/management/operations**");await page.route("**/api/management/operations**",r=>r.fulfill({status:401,json:{error:"Owner verification required."}}));}};
}
async function openEditor(page:Page){await page.getByText("Knowledge drafts",{exact:true}).click();await page.getByRole("button",{name:"New knowledge draft"}).click();await page.getByLabel("Draft title").fill("Synthetic verified information");await page.getByLabel("Verified information",{exact:true}).fill("A synthetic fact for this browser test.");await page.getByLabel("Evidence and provenance").fill("Synthetic owner evidence");}
for(const theme of ["light","dark"] as const)for(const width of [1280,390])test(`live reporting and editorial fit ${width}px in ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page);await page.goto("/manage/live");await page.getByLabel("Workspace color theme").selectOption(theme);
 await page.getByText("Conversation reporting",{exact:true}).click();await page.getByRole("button",{name:"Refresh report"}).click();await expect(page.getByText(/these are partial totals/)).toBeVisible();await expect(page.getByText("20 / 900",{exact:true})).toBeVisible();await openEditor(page);
 expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole("button",{name:"Save knowledge draft"}).click();await expect(page.getByText(/Saved revision 1 to staging/)).toBeVisible();await page.screenshot({path:`.ev-preview/operations-${theme}-${width}.png`,fullPage:true});
});
test("an uncertain committed save keeps text, retries its receipt, survives reload, and rejects stale edits",async({page})=>{
 const state=await setup(page);await page.goto("/manage/live");await openEditor(page);state.failNext();await page.getByRole("button",{name:"Save knowledge draft"}).click();await expect(page.getByText(/operation could not be confirmed/)).toBeVisible();await expect(page.getByLabel("Verified information",{exact:true})).toHaveValue("A synthetic fact for this browser test.");await page.getByRole("button",{name:"Save knowledge draft"}).click();await expect(page.getByText(/Saved revision 1 to staging/)).toBeVisible();expect(state.requests).toHaveLength(2);expect(state.requests[0]).toBe(state.requests[1]);
 await page.reload();await page.getByText("Knowledge drafts",{exact:true}).click();await page.getByRole("button",{name:"Refresh drafts"}).click();await page.getByRole("button",{name:/Synthetic verified information/}).click();await expect(page.getByLabel("Verified information",{exact:true})).toHaveValue("A synthetic fact for this browser test.");
 state.conflict();await page.getByLabel("Verified information",{exact:true}).fill("Keep this competing edit.");await page.getByRole("button",{name:"Save knowledge draft"}).click();await expect(page.getByText(/This draft changed/)).toBeVisible();await expect(page.getByLabel("Verified information",{exact:true})).toHaveValue("Keep this competing edit.");await page.getByRole("button",{name:"Check saved version"}).click();await expect(page.getByRole("heading",{name:"Current saved revision 1"})).toBeVisible();await expect(page.getByLabel("Verified information",{exact:true})).toHaveValue("Keep this competing edit.");await page.getByRole("button",{name:"Replace editor with saved version"}).click();await expect(page.getByLabel("Verified information",{exact:true})).toHaveValue("A synthetic fact for this browser test.");
});
test("revocation removes reports and draft text from the private workspace",async({page})=>{const state=await setup(page);await page.goto("/manage/live");await openEditor(page);await state.revoke();await page.getByRole("button",{name:"Save knowledge draft"}).click();await expect(page.getByRole("heading",{name:"Owner sign-in"})).toBeVisible();await expect(page.getByLabel("Verified information",{exact:true})).toHaveCount(0);});

