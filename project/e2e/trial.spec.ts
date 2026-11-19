import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Synthetic Auth responses exercise the browser UI without user credentials.
// These are not live Supabase authentication or cross-device sync tests.
test("sign in, setup, save/reopen, download PDF and sign out", async ({ page }) => {
 const user = { id: "96e0bfb7-515e-4ff5-99bb-9ce9dac95983", aud: "authenticated", role: "authenticated", email: "trial@example.invalid", created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
 const jwt = [btoa(JSON.stringify({alg:"HS256",typ:"JWT"})),btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})), "test"].join(".");
 let destination:any=null;let reviewReceipt:any=null;
 await page.route("https://liyanna-browser-test.supabase.co/**", async route => {
   const path = new URL(route.request().url()).pathname;
   if(path.endsWith('/rpc/liyanna_finbase_destination')) {
     const input=route.request().postDataJSON();
     if(!destination)destination={businessId:input.p_business,revision:0,status:'not_saved',config:null,postingAuthorized:false,updatedAt:null};
     if(input.p_action!=='read') {
       if(input.p_expected!==destination.revision)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'40001',message:'destination_revision_conflict'})});
       destination={...destination,revision:destination.revision+1,status:input.p_action==='save'?'draft':'revoked',config:input.p_config??destination.config,updatedAt:new Date().toISOString()};
     }
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(destination)});
   }
   if(path.endsWith('/rpc/liyanna_finbase_review')) {
    const input=route.request().postDataJSON();
    if(input.p_action==='read')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({businessId:input.p_business,postingAuthorized:false,receipts:reviewReceipt?[reviewReceipt]:[]})});
    const duplicate=Boolean(reviewReceipt);
    if(!reviewReceipt){const id=crypto.randomUUID();reviewReceipt={id,destinationRevision:input.p_destination_revision,destination:destination.config,preparedAt:new Date().toISOString(),event:{schemaVersion:'1.0',eventId:id,occurredAt:new Date().toISOString(),tenantId:input.p_business,businessId:input.p_business,source:'liyanna',documentId:input.p_document,documentNumber:'INV-REVIEW-TEST',customerRef:input.p_customer,currency:'LKR',issuedOn:'2026-11-19',dueOn:null,total:'125.50',taxTotal:'0.00',revision:input.p_document_revision}};}
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({businessId:input.p_business,postingAuthorized:false,duplicate,receipt:reviewReceipt})});
   }
   const body = path.endsWith("/token") ? { access_token:jwt,refresh_token:"synthetic-refresh",expires_in:3600,token_type:"bearer",user }
     : path.endsWith("/user") ? user : path.includes("/rest/v1/") ? [] : {};
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)});
 });
 await page.goto("/");
 await page.getByLabel("Email", {exact:true}).fill(user.email);
 await page.getByLabel("Password", {exact:true}).fill("synthetic-test-password");
 await page.getByRole("button",{name:"Sign in",exact:true}).click();
 await page.getByLabel("Business name", {exact:true}).fill("Trial verification");
 await page.getByLabel("Preferred currency", {exact:true}).selectOption("LKR");
 await page.getByRole("button",{name:"Create my workspace"}).click();
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Customers',exact:true}).click();
 await page.getByRole('button',{name:'Add customer',exact:true}).first().click();
 await page.getByRole('dialog').getByLabel('Customer name',{exact:true}).fill('Trial customer');
 await page.getByRole('dialog').getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Documents',exact:true}).click();
 for (const kind of ["invoice", "quote"]) {
   await page.getByRole("button",{name:kind==="invoice"?"Create invoice":"Create quote",exact:true}).first().click();
   await page.getByLabel("Customer name", {exact:true}).fill("Trial customer");
   await page.getByLabel("Description 1", {exact:true}).fill("Service for trial customer");
   await page.getByLabel("Rate 1", {exact:true}).fill("125.50");
   await page.getByRole("button",{name:"Save draft",exact:true}).click();
   await expect(page.getByRole("main").getByText("Saved on this device", {exact:true})).toBeVisible();
   for (const [language, description] of [["en","Professional service"],["si","නිර්මාණ සේවාව"],["ta","வடிவமைப்பு சேவை"]]) {
     await page.getByLabel("Document language", {exact:true}).selectOption(language);
     await page.getByLabel("Description 1", {exact:true}).fill(description);
     const downloading = page.waitForEvent("download");
     await page.getByRole("button",{name:"Download PDF",exact:true}).click();
     const download = await downloading;
     expect(download.suggestedFilename()).toMatch(/\.pdf$/);
     const bytes = await readFile((await download.path())!);
     expect(bytes.subarray(0,5).toString()).toBe("%PDF-");
     expect(bytes.length).toBeGreaterThan(1000);
   }
   await page.getByRole("button",{name:"Back to documents",exact:true}).click();
 }
 await page.reload();
 await expect(page.getByText("Trial customer", {exact:true})).toHaveCount(2);
 await page.getByRole("navigation",{name:"Main navigation"}).getByRole("button",{name:"Integrations",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Before importing",exact:true})).toBeVisible();
 await expect(page.getByText("Issuance approval needed: 1",{exact:true})).toBeVisible();
 await expect(page.getByText("Due date missing: 1",{exact:true})).toBeVisible();
 await page.getByLabel('Destination name',{exact:true}).fill('Trial FINBASE company');
 await page.getByLabel('FINBASE company ID',{exact:true}).fill('trial-company');
 await page.getByLabel('Income mapping ID',{exact:true}).fill('services');
 const confirmation=page.getByRole('checkbox',{name:'I reviewed these destination references.',exact:false});
 const saveDestination=page.getByRole('button',{name:'Save review destination',exact:true});
 await expect(saveDestination).toBeDisabled();
 await confirmation.check();await saveDestination.click();
 await expect(page.getByText('Draft settings saved · Version 1',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Reload destination settings',exact:true}).click();
 await expect(page.getByLabel('FINBASE company ID',{exact:true})).toHaveValue('trial-company');
 // Simulate another session saving newer settings; stale writes must fail visibly.
 destination={...destination,revision:2};
 await confirmation.check();await saveDestination.click();
 await expect(page.getByRole('region',{name:'FINBASE review destination',exact:true}).getByRole('alert')).toHaveText('These settings changed in another session. Reload before saving again.');
 await page.getByRole('button',{name:'Reload destination settings',exact:true}).click();
 await expect(page.getByText('Draft settings saved · Version 2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Reload review events',exact:true}).click();
 await page.getByLabel('Invoice for cloud review',{exact:true}).selectOption({index:1});
 await page.getByLabel('Matching customer record',{exact:true}).selectOption({index:1});
 const reviewConfirm=page.getByRole('checkbox',{name:'I reviewed this invoice and destination for staging only.',exact:true});
 const prepareReview=page.getByRole('button',{name:'Prepare cloud review event',exact:true});
 await expect(prepareReview).toBeDisabled();await reviewConfirm.check();await prepareReview.click();
 await expect(page.getByText('Cloud review event prepared. Download it for FINBASE staging review.',{exact:true})).toBeVisible();
 const reviewDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download review event INV-REVIEW-TEST',exact:true}).click();
 const reviewFile=await reviewDownload;
 const reviewEvent=JSON.parse(await readFile((await reviewFile.path())!,'utf8'));
 expect(reviewEvent.eventId).toBe(reviewReceipt.id);expect(reviewEvent.total).toBe('125.50');
 await reviewConfirm.check();await prepareReview.click();
 await expect(page.getByText('Existing review event reused. Its ID and payload are unchanged.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Reload review events',exact:true}).click();
 await expect(page.getByRole('button',{name:'Download review event INV-REVIEW-TEST',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Revoke saved destination',exact:true}).click();
 await expect(page.getByText('Destination revoked · Version 3',{exact:true})).toBeVisible();
 expect(destination.postingAuthorized).toBe(false);
 const handoffDownload=page.waitForEvent("download");
 await page.getByRole("button",{name:"Download invoice snapshot",exact:true}).click();
 const handoffFile=await handoffDownload;
 const snapshot=JSON.parse(await readFile((await handoffFile.path())!,"utf8"));
 expect(snapshot.schemaVersion).toBe("liyanna.invoice-snapshot.v1");
 expect(snapshot.postingAuthorized).toBe(false);
 expect(snapshot.origin).toBe("device");
 expect(snapshot.invoices).toHaveLength(1);
 expect(snapshot.invoices[0].totals.total).toBe("125.50");
 await page.getByRole("button",{name:"Sign out",exact:true}).first().click();
 await expect(page.getByRole("heading",{name:"Sign in to Liyanna"})).toBeVisible();
});
