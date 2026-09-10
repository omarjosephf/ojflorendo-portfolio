import {test,expect,type Page} from "@playwright/test";
import { captchaSiteKey, mockAuthCaptcha } from "./auth-captcha-fixture";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async({page})=>{await page.route("**/api/**",route=>route.abort());});
const id="10000000-0000-4000-8000-000000000001";
async function fixture(page:Page){
 await mockAuthCaptcha(page);
 let status="signed_out",reads=0,revoked=false;
 await page.route("**/api/management/owner**",async route=>{
  const url=new URL(route.request().url()),body=route.request().method()==="POST"?route.request().postDataJSON():{};
  if(revoked){await route.fulfill({status:401,json:{error:"Owner sign-in and current authenticator verification are required."}});return;}
  if(body.action==="sign_in"){expect(body.captchaToken).toMatch(/^synthetic-token-/);status="mfa_required";}
  if(body.action==="verify")status="ready";
  if(body.action==="sign_out")status="signed_out";
  if(url.searchParams.get("view")==="conversations"){reads++;await route.fulfill({json:{conversations:[{id,user_id:id,app:"ev",created_at:"2026-09-09T00:00:00Z",expires_at:"2026-10-09T00:00:00Z"}],next:null}});return;}
  if(url.searchParams.has("conversation")){reads++;await route.fulfill({json:{messages:[{id,conversation_id:id,request_id:id,sequence:1,role:"user",body:"Synthetic staging question for owner review.",created_at:"2026-09-09T00:00:00Z"},{id:"20000000-0000-4000-8000-000000000002",conversation_id:id,request_id:id,sequence:2,role:"assistant",body:"Synthetic unsupported reply.",created_at:"2026-09-09T00:00:01Z",event:{version:1,outcome:"not_covered",route:"primary",model:"synthetic-model",retrieved:["project-cited.md"],cited:[],latencyMs:123,corpusSha256:"a".repeat(64),promptSha256:"b".repeat(64)}}]}});return;}
  await route.fulfill({json:{status,authCaptcha:{required:true,siteKey:captchaSiteKey},factorId:status==="mfa_required"?id:null}});
 });return {reads:()=>reads,revoke:()=>{revoked=true;}};
}
async function signIn(page:Page){await page.getByLabel("Email",{exact:true}).fill("owner@example.test");await page.getByLabel("Password",{exact:true}).fill("synthetic-password");await page.getByRole("button",{name:"Complete synthetic verification"}).click();await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page.getByRole("heading",{name:"Verify your authenticator"})).toBeVisible();}
async function verify(page:Page){await page.getByLabel("Six-digit code").fill("123456");await page.getByRole("button",{name:"Verify",exact:true}).click();await expect(page.getByText("Owner verified · Authenticator required",{exact:true})).toBeVisible();}
async function audit(page:Page){expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
for(const theme of ["light","dark"] as const)for(const width of [1280,390])test(`owner sign-in, MFA and saved inbox fit ${width}px in ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});const state=await fixture(page);await page.goto("/manage/live");await expect(page.getByRole("heading",{name:"Owner sign-in"})).toBeVisible();await page.getByLabel("Workspace color theme").selectOption(theme);await audit(page);
 await signIn(page);expect(state.reads()).toBe(0);await audit(page);await verify(page);
 await page.getByRole("button",{name:"Refresh conversations"}).click();await page.getByRole("button",{name:/Chat 10000000 · Guest/}).click();await expect(page.getByText("Synthetic staging question for owner review.",{exact:true})).toBeVisible();await page.getByText("Inspect retrieval details",{exact:true}).click();await expect(page.getByText("Retrieved: project-cited.md",{exact:true})).toBeVisible();await expect(page.getByText("Review the sources before deciding whether knowledge is missing or retrieval needs adjustment.",{exact:true})).toBeVisible();await audit(page);
 await page.screenshot({path:`.ev-preview/live-owner-${theme}-${width}.png`,fullPage:true});
 await page.getByRole("button",{name:"Sign out",exact:true}).click();await expect(page.getByRole("heading",{name:"Owner sign-in"})).toBeVisible();await expect(page.getByText("Synthetic staging question for owner review.",{exact:true})).toHaveCount(0);
});
test("an expired owner session clears the displayed private transcript",async({page})=>{
 const state=await fixture(page);await page.goto("/manage/live");await signIn(page);await verify(page);await page.getByRole("button",{name:"Refresh conversations"}).click();await page.getByRole("button",{name:/Chat 10000000 · Guest/}).click();await expect(page.getByText("Synthetic staging question for owner review.",{exact:true})).toBeVisible();state.revoke();await page.getByRole("button",{name:"Refresh conversations"}).click();await expect(page.getByRole("heading",{name:"Owner sign-in"})).toBeVisible();await expect(page.getByText("Synthetic staging question for owner review.",{exact:true})).toHaveCount(0);
});

for(const theme of ["light","dark"] as const)for(const width of [1280,390])test(`one-time owner password setup fits ${width}px in ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:900});let submissions=0;
 await page.route("**/api/management/owner**",async route=>{if(route.request().method()==="POST"){submissions++;const body=route.request().postDataJSON();expect(body.action).toBe("initialize");expect(body).not.toHaveProperty("userId");await route.fulfill({json:{status:"mfa_required",factorId:id}});}else await route.fulfill({json:{status:"setup_required",email:"owner@example.test"}});});
 await page.goto("/manage/live");await expect(page.getByRole("heading",{name:"Set your owner password"})).toBeVisible();await page.getByLabel("Workspace color theme").selectOption(theme);await audit(page);
 await page.getByLabel("New password",{exact:true}).fill("a-long-synthetic-password");await page.getByLabel("Confirm password",{exact:true}).fill("a-different-long-password");await page.getByRole("button",{name:"Set password and continue"}).click();await expect(page.getByRole("main").getByRole("alert")).toHaveText("The passwords do not match.");expect(submissions).toBe(0);
 await page.getByLabel("Confirm password",{exact:true}).fill("a-long-synthetic-password");await page.getByRole("button",{name:"Set password and continue"}).click();await expect(page.getByRole("heading",{name:"Verify your authenticator"})).toBeVisible();expect(submissions).toBe(1);
});
