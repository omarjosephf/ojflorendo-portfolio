import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const factorId="10000000-0000-4000-8000-000000000001";
// This key belongs only to the mocked browser fixture, never a live identity.
const syntheticKey="JBSWY3DPEHPK3PXP";
for(const theme of ["light","dark"] as const)for(const width of [1280,390])test(`first authenticator enrollment fits ${width}px in ${theme}`,async({page})=>{
 await page.setViewportSize({width,height:1100});
 await page.route("**/api/**",route=>route.abort());
 let enrolled=false,verified=false,enrollments=0;
 await page.route("**/api/management/owner**",async route=>{
  const body=route.request().method()==="POST"?route.request().postDataJSON():{};
  if(body.action==="enroll"){enrolled=true;enrollments++;}
  if(body.action==="verify"){expect(body.factorId).toBe(factorId);expect(body.code).toBe("123456");verified=true;}
  await route.fulfill({json:{status:verified?"ready":"mfa_required",factorId:enrolled?factorId:null,...(body.action==="enroll"?{secret:syntheticKey}:{})}});
 });
 await page.goto("/manage/live");
 await page.getByLabel("Workspace color theme").selectOption(theme);
 await expect(page.getByText(/E.V does not send it by email or text message/)).toBeVisible();
 await expect(page.getByLabel("Six-digit code")).toHaveCount(0);
 await page.getByRole("button",{name:"Set up authenticator",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Connect E.V Management to your phone"})).toBeVisible();
 await expect(page.getByText(syntheticKey,{exact:true})).toBeVisible();
 await expect(page.getByText("Time based",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Set up authenticator",exact:true})).toHaveCount(0);
 expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze()).violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.ev-preview/authenticator-${theme}-${width}.png`,fullPage:true});
 await page.getByLabel("Six-digit code").fill("123456");
 await page.getByRole("button",{name:"Verify",exact:true}).click();
 await expect(page.getByText("Owner verified · Authenticator required",{exact:true})).toBeVisible();
 await expect(page.getByText(syntheticKey,{exact:true})).toHaveCount(0);
 expect(enrollments).toBe(1);
});
