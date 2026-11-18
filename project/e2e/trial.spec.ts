import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Synthetic Auth responses exercise the browser UI without user credentials.
// These are not live Supabase authentication or cross-device sync tests.
test("sign in, setup, save/reopen, download PDF and sign out", async ({ page }) => {
 const user = { id: "96e0bfb7-515e-4ff5-99bb-9ce9dac95983", aud: "authenticated", role: "authenticated", email: "trial@example.invalid", created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
 const jwt = [btoa(JSON.stringify({alg:"HS256",typ:"JWT"})),btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})), "test"].join(".");
 await page.route("https://liyanna-browser-test.supabase.co/**", async route => {
   const path = new URL(route.request().url()).pathname;
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
 for (const kind of ["invoice", "quote"]) {
   await page.getByRole("button",{name:kind==="invoice"?"Create invoice":"Create quote",exact:true}).first().click();
   await page.getByLabel("Customer name", {exact:true}).fill("Trial customer");
   await page.getByLabel("Description 1", {exact:true}).fill("Service for trial customer");
   await page.getByLabel("Rate 1", {exact:true}).fill("125.50");
   await page.getByRole("button",{name:"Save draft",exact:true}).click();
   await expect(page.getByRole("main").getByText("Saved on this device", {exact:true})).toBeVisible();
   const downloading = page.waitForEvent("download");
   await page.getByRole("button",{name:"Download PDF",exact:true}).click();
   const download = await downloading;
   expect(download.suggestedFilename()).toMatch(/\.pdf$/);
   const bytes = await readFile((await download.path())!);
   expect(bytes.subarray(0,5).toString()).toBe("%PDF-");
   await page.getByRole("button",{name:"Back to documents",exact:true}).click();
 }
 await page.reload();
 await expect(page.getByText("Trial customer", {exact:true})).toHaveCount(2);
 await page.getByRole("button",{name:"Sign out",exact:true}).first().click();
 await expect(page.getByRole("heading",{name:"Sign in to Liyanna"})).toBeVisible();
});
