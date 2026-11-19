import { test, expect, type BrowserContext } from "@playwright/test";
import { emptyWorkspace } from "../src/domain/model";

// Shared in-memory provider; real browser state/IndexedDB, synthetic Auth and RPC.
// This verifies client behavior, not live Supabase credentials or production sync.
test("two independent browsers exchange documents and reset cloud controls on workspace switch", async ({ browser }) => {
 const a=emptyWorkspace(), b=emptyWorkspace();
 a.business.name="Sync trial"; a.business.currency="LKR";
 b.business.name="Second trial"; b.business.currency="LKR";
 const states=new Map([[a.business.id,{revision:0,role:"owner",scope:"owner",snapshot:a}],
 [b.business.id,{revision:0,role:"owner",scope:"owner",snapshot:b}]]);
 const user={id:"96e0bfb7-515e-4ff5-99bb-9ce9dac95983",aud:"authenticated",role:"authenticated",email:"sync@example.invalid",created_at:new Date().toISOString(),app_metadata:{},user_metadata:{}};
 const jwt=[btoa(JSON.stringify({alg:"HS256",typ:"JWT"})),btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})),"test"].join(".");
 async function connect(context: BrowserContext) {
  await context.route("https://liyanna-browser-test.supabase.co/**",async route=>{
   const request=route.request(), path=new URL(request.url()).pathname;
   let body:unknown={};
   if(path.endsWith("/token")) body={access_token:jwt,refresh_token:"synthetic-refresh",expires_in:3600,token_type:"bearer",user};
   else if(path.endsWith("/user")) body=user;
   else if(path.endsWith("/liyanna_businesses")) body=[a,b].map(s=>({id:s.business.id,profile:s.business}));
   else if(path.endsWith("/liyanna_read_workspace")) body=states.get(request.postDataJSON().p_business);
   else if(path.endsWith("/liyanna_sync")) {
    const input=request.postDataJSON(), state=states.get(input.p_business)!;
    if(state.revision!==input.p_expected) {
     await route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({message:"revision_conflict",code:"40001"})});return;
    }
    state.snapshot=input.p_snapshot; state.revision++; body=state;
   } else if(path.endsWith("/liyanna_backups")) {
     body=[{id:"63ade750-d3f8-4ab8-86e1-ea837f54394e",created_at:"2026-11-19T12:00:00Z"}];
   } else if(path.includes("/rest/v1/")) body=[];
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)});
  });
  const page=await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto("/");
  await page.getByLabel("Email",{exact:true}).fill(user.email);
  await page.getByLabel("Password",{exact:true}).fill("synthetic-password");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await page.getByRole("button",{name:"Open Sync trial",exact:true}).click();
  return page;
 }
 const firstContext=await browser.newContext(), secondContext=await browser.newContext();
 try {
  const first=await connect(firstContext), second=await connect(secondContext);
  async function add(page:typeof first,kind:"invoice"|"quote") {
   await page.getByRole("button",{name:kind==="invoice"?"Create invoice":"Create quote",exact:true}).first().click();
   await page.getByLabel("Customer name",{exact:true}).fill("Sync customer");
   await page.getByLabel("Description 1",{exact:true}).fill("Shared service");
   await page.getByLabel("Rate 1",{exact:true}).fill("125.50");
   await page.getByRole("button",{name:"Save draft",exact:true}).click();
   await page.getByRole("button",{name:"Back to documents",exact:true}).click();
  }
  async function sync(page:typeof first) {
   await page.getByRole("navigation",{name:"Main navigation"}).getByRole("button",{name:"Backup & team",exact:true}).click();
   await page.getByRole("button",{name:"Sync now",exact:true}).click();
  }
  await add(first,"invoice"); await sync(first);
  await expect.poll(()=>states.get(a.business.id)!.snapshot.documents.length).toBe(1);
  await sync(second);
  await second.getByRole("navigation",{name:"Main navigation"}).getByRole("button",{name:"Documents",exact:true}).click();
  await expect(second.getByText("Sync customer",{exact:true})).toHaveCount(1);
  await add(second,"quote"); await sync(second);
  await expect.poll(()=>states.get(a.business.id)!.snapshot.documents.length).toBe(2);
  await first.getByRole("button",{name:"Sync now",exact:true}).click();
  await first.getByRole("navigation",{name:"Main navigation"}).getByRole("button",{name:"Documents",exact:true}).click();
  await expect(first.getByText("Sync customer",{exact:true})).toHaveCount(2);

  await sync(first);
  const consent=first.getByRole("checkbox",{name:/I understand this uploads a copy/});
  await consent.check();
  await first.getByRole("button",{name:"Refresh backups",exact:true}).first().click();
  await expect(first.getByRole("button",{name:"Restore to this device",exact:true})).toHaveCount(1);
  first.on("dialog",dialog=>dialog.accept());
  await first.getByLabel("Open shared business",{exact:true}).selectOption(b.business.id);
  await expect(consent).not.toBeChecked();
  await expect(first.getByRole("button",{name:"Restore to this device",exact:true})).toHaveCount(0);
 } finally {await Promise.allSettled([firstContext.close(),secondContext.close()]);}
});
