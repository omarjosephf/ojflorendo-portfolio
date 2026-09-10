import {test,expect,type Page} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const id="10000000-0000-4000-8000-000000000001",draftId="20000000-0000-4000-8000-000000000001";
async function fixture(page:Page){
 await page.route("**/api/**",r=>r.abort());
 await page.route("**/api/management/owner**",r=>r.fulfill({json:{status:"ready"}}));
 await page.route("**/api/management/operations**",r=>r.fulfill({json:{drafts:[{id:draftId,title:"Synthetic knowledge draft",status:"draft",revision:1,updated_at:"2026-09-09T00:00:00Z"}]}}));
 let gap={message_id:id,conversation_id:id,created_at:"2026-09-09T00:00:00Z",question:"Synthetic unanswered service question?",question_shortened:false,answer:"Synthetic unsupported reply.",answer_shortened:false,observed:"not_covered",retrieved:["project-cited.md"],cited:[],diagnosis:"unclassified",status:"new",note:"",draft_id:null as string|null,revision:0};
 let fail=true,conflict=false;const writes:Record<string,unknown>[]=[];
 await page.route("**/api/management/gaps",async r=>{
  if(r.request().method()==="GET"){await r.fulfill({json:{gaps:[gap]}});return;}
  const body=r.request().postDataJSON();writes.push(body);
  if(conflict){await r.fulfill({status:409,json:{error:"This review changed. Keep your note and reload the saved review before applying your edits."}});return;}
  if(fail){fail=false;await r.fulfill({status:503,json:{error:"Save not confirmed. Keep your note and retry."}});return;}
  gap={...gap,diagnosis:body.diagnosis,status:body.status,note:body.note,draft_id:body.draftId,revision:gap.revision+1};await r.fulfill({json:{saved:{messageId:id,revision:gap.revision}}});
 });return {writes,conflict:()=>{conflict=true;}};
}
async function open(page:Page){await page.goto("/manage/live");await page.getByText("Gap reviews",{exact:true}).click();await page.getByRole("button",{name:"Refresh gap reviews",exact:true}).click();await page.getByRole("button",{name:/Synthetic unanswered service question/}).click();}
for(const theme of ["light","dark"] as const)for(const width of [1280,390])test(`live gap save retry and reload ${theme} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});const state=await fixture(page);await open(page);await page.getByLabel("Workspace color theme").selectOption(theme);
 await expect(page.getByLabel("Review diagnosis")).toHaveValue("unclassified");await page.getByLabel("Review diagnosis").selectOption("missing_content");await page.getByLabel("Gap review status").selectOption("drafted");await page.getByLabel("Review note",{exact:true}).fill("Synthetic human source review note.");await page.getByLabel("Linked knowledge draft").selectOption(draftId);
 await page.getByRole("button",{name:"Save gap review",exact:true}).click();await expect(page.getByRole("main").getByRole("alert")).toContainText("Keep your note");await expect(page.getByLabel("Review note",{exact:true})).toHaveValue("Synthetic human source review note.");await page.getByRole("button",{name:"Save gap review",exact:true}).click();await expect(page.getByRole("status")).toHaveText("Saved review revision 1.");expect(state.writes[0]).toEqual(state.writes[1]);
 await page.reload();await page.getByText("Gap reviews",{exact:true}).click();await page.getByRole("button",{name:"Refresh gap reviews",exact:true}).click();await page.getByRole("button",{name:/Synthetic unanswered service question/}).click();await expect(page.getByLabel("Review note",{exact:true})).toHaveValue("Synthetic human source review note.");await expect(page.getByLabel("Linked knowledge draft")).toHaveValue(draftId);
 expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:`.ev-preview/live-gaps-${theme}-${width}.png`,fullPage:true});
});
test("stale gap edits stay in the editor until an explicit replacement",async({page})=>{const state=await fixture(page);await open(page);state.conflict();await page.getByLabel("Review note",{exact:true}).fill("Keep this synthetic note");await page.getByRole("button",{name:"Save gap review",exact:true}).click();await expect(page.getByRole("main").getByRole("alert")).toContainText("review changed");await expect(page.getByLabel("Review note",{exact:true})).toHaveValue("Keep this synthetic note");await page.getByRole("button",{name:"Replace review with saved version",exact:true}).click();await expect(page.getByLabel("Review note",{exact:true})).toHaveValue("");});
