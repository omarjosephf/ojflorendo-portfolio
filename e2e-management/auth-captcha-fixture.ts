import type { Page } from "@playwright/test";
export const captchaSiteKey="0xTEST_AUTH_KEY";
/** All tokens and challenge UI are synthetic; never contact Cloudflare/Auth. */
export async function mockAuthCaptcha(page:Page){
  await page.route("https://challenges.cloudflare.com/**",async route=>{
    if(!route.request().url().includes("/turnstile/v0/api.js")){await route.abort();return;}
    await route.fulfill({contentType:"application/javascript",body:`(()=>{
      let next=0;const widgets=new Map();
      window.turnstile={render(container,options){const id=String(++next);const button=document.createElement('button');button.type='button';button.textContent='Complete synthetic verification';button.onclick=()=>options.callback('synthetic-token-'+id);container.appendChild(button);widgets.set(id,{container,options});return id;},reset(id){widgets.get(id)?.options['expired-callback']();},remove(id){widgets.get(id)?.container.replaceChildren();widgets.delete(id);}};
    })();`});
  });
}
