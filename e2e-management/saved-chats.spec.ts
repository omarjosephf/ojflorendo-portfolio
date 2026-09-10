import { test, expect, type Page } from "@playwright/test";
import { captchaSiteKey, mockAuthCaptcha } from "./auth-captcha-fixture";
import AxeBuilder from "@axe-core/playwright";
const answer={state:"answered",answer:"OJ has two published projects: Cited and this portfolio platform.",citations:[{quote:"OJ has two published projects",label:"About OJ",href:"/#about"}],modelRoute:"primary"};
async function fixture(page:Page,failSave=false){
  await page.route("**/api/**",route=>route.abort());
  await mockAuthCaptcha(page);
  let connected=false,generationCalls=0,saveCalls=0;
  const conversations:{id:string;app:string;created_at:string;expires_at:string}[]=[];
  const messages:Record<string,unknown[]>={};
  await page.route("**/api/conversation-session",async route=>{
    const body=route.request().method()==="POST"?route.request().postDataJSON():{};
    if(body.action==="connect"){expect(body.captchaToken).toMatch(/^synthetic-token-/);connected=true;}if(body.action==="disconnect")connected=false;
    await route.fulfill({json:{status:connected?"connected":"disconnected",captchaSiteKey}});
  });
  await page.route("**/api/conversations**",async route=>{
    const url=new URL(route.request().url()),body=route.request().method()==="POST"?route.request().postDataJSON():{};
    let result:unknown;
    if(url.pathname.endsWith("/ask")){
      if(body.action==="save"){saveCalls++;result={saved:true};}
      else{generationCalls++;messages[body.conversationId]=[
        {id:crypto.randomUUID(),conversation_id:body.conversationId,request_id:body.requestId,sequence:1,role:"user",body:body.question,created_at:"2026-09-09T00:00:00Z"},
        {id:crypto.randomUUID(),conversation_id:body.conversationId,request_id:body.requestId,sequence:2,role:"assistant",body:answer.answer,result:answer,created_at:"2026-09-09T00:00:01Z"},
      ];result={result:answer,saved:!failSave,...(failSave?{receipt:"synthetic-signed-receipt"}:{})};}
    }else if(body.action==="create"){
      conversations.push({id:body.id,app:"ev",created_at:"2026-09-09T00:00:00Z",expires_at:"2026-10-09T00:00:00Z"});messages[body.id]=[];result={id:body.id,saved:true};
    }else if(body.action==="delete"){
      const index=conversations.findIndex(c=>c.id===body.conversationId);if(index>=0)conversations.splice(index,1);delete messages[body.conversationId];result={deleted:index>=0};
    }else result=url.searchParams.has("conversationId")?{messages:messages[url.searchParams.get("conversationId")!]??[]}:{conversations};
    await route.fulfill({json:result});
  });
  return {counts:()=>({generationCalls,saveCalls}),conversations};
}
async function open(page:Page){await page.goto("/");await page.getByRole("button",{name:"Open E.V",exact:true}).click();await expect(page.getByLabel("Message E.V",{exact:true})).toBeEnabled();await page.getByText("Save and return to chats",{exact:true}).click();}
async function connect(page:Page){await page.getByRole("button",{name:"Start a new saved chat"}).click();await page.getByRole("button",{name:"Complete synthetic verification"}).click();await page.getByRole("button",{name:"Verify and start saved chat"}).click();await expect(page.getByText(/New messages will be saved/)).toBeVisible();}
async function send(page:Page){await page.getByLabel("Message E.V",{exact:true}).fill("What projects has OJ published?");await page.getByRole("button",{name:"Send message to E.V",exact:true}).click();await expect(page.getByText(answer.answer,{exact:true})).toBeVisible();}
test("explicit saved chat restores after reload and deletes its server copy",async({page})=>{
  const state=await fixture(page);await open(page);expect(state.conversations).toHaveLength(0);
  await connect(page);await send(page);await expect(page.getByText("Chat saved for 30 days.",{exact:true})).toBeVisible();
  expect(state.conversations).toHaveLength(1);await page.reload();await page.getByRole("button",{name:"Open E.V",exact:true}).click();await expect(page.getByText(answer.answer,{exact:true})).toBeVisible();
  await page.getByText("Saved chat options",{exact:true}).click();await expect(page.getByText("Saved chat restored.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Delete saved chat"}).click();await expect(page.getByText("Saved chat deleted.",{exact:true})).toBeVisible();await expect(page.getByText(answer.answer,{exact:true})).toHaveCount(0);
  expect(state.conversations).toHaveLength(0);expect(state.counts().generationCalls).toBe(1);
});
test("failed saving preserves the visible answer and retries storage without generation",async({page})=>{
  const state=await fixture(page,true);await open(page);await connect(page);await send(page);
  await expect(page.getByText(/Reply not saved online/)).toBeVisible();await page.getByRole("button",{name:"Retry saving 1 reply"}).click();
  await expect(page.getByText("Replies saved without asking the model again.",{exact:true})).toBeVisible();expect(state.counts()).toEqual({generationCalls:1,saveCalls:1});
});
for(const theme of ["light","dark"] as const)for(const width of [1280,390])test(`saved chat controls are accessible in ${theme} at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await fixture(page);await open(page);await page.getByLabel("Portfolio color theme").selectOption(theme);await connect(page);await send(page);
  const audit=await new AxeBuilder({page}).include('[role="dialog"]').withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();expect(audit.violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

for(const theme of ["light","dark"] as const)test(`signup challenge remains usable at 390px in ${theme}`,async({page})=>{
  await page.setViewportSize({width:390,height:900});const state=await fixture(page);await open(page);await page.getByLabel("Portfolio color theme").selectOption(theme);
  await page.getByRole("button",{name:"Start a new saved chat"}).click();const start=page.getByRole("button",{name:"Verify and start saved chat"});await expect(start).toBeDisabled();
  const audit=await new AxeBuilder({page}).include('[role="dialog"]').withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();expect(audit.violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const scriptNonce=await page.locator("#cf-turnstile-script").evaluate((element:HTMLScriptElement)=>element.nonce);expect(scriptNonce.length).toBeGreaterThan(10);
  await page.getByRole("dialog").screenshot({path:`.ev-preview/signup-challenge-${theme}-390.png`});await page.getByRole("button",{name:"Cancel",exact:true}).click();expect(state.conversations).toHaveLength(0);expect(state.counts().generationCalls).toBe(0);await expect(page.getByLabel("Message E.V",{exact:true})).toBeEnabled();
});
