import { test, expect } from "@playwright/test";

// No email is sent: every Auth request in these cases is intercepted.
test("failed login shows the error and clears the password", async ({ page }) => {
 await page.route("https://liyanna-browser-test.supabase.co/**", route =>
   route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({msg:"Invalid login credentials",error_code:"invalid_credentials"})}));
 await page.goto("/");
 await page.getByLabel("Email",{exact:true}).fill("trial@example.invalid");
 await page.getByLabel("Password",{exact:true}).fill("incorrect-test-password");
 await page.getByRole("button",{name:"Sign in",exact:true}).click();
 await expect(page.getByRole("alert").filter({hasText:"Invalid login credentials"})).toContainText("Invalid login credentials");
 await expect(page.getByLabel("Password",{exact:true})).toHaveValue("");
 await expect(page.getByRole("heading",{name:"Sign in to Liyanna"})).toBeVisible();
});
test("recovery request uses generic confirmation without account disclosure", async ({ page }) => {
 let requested=false;
 await page.route("https://liyanna-browser-test.supabase.co/**", async route => {
   if(new URL(route.request().url()).pathname.endsWith("/recover")) requested=true;
   await route.fulfill({status:200,contentType:"application/json",body:"{}"});
 });
 await page.goto("/");
 await page.getByLabel("Email",{exact:true}).fill("trial@example.invalid");
 await page.getByRole("button",{name:"Forgot password?",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("If this account exists");
 expect(requested).toBe(true);
});
test("expired recovery link does not offer a password change form", async ({ page }) => {
 await page.goto("/?account=recovery#error=access_denied&error_description=expired");
 await expect(page.getByText(/This recovery link is invalid or expired/)).toBeVisible();
 await expect(page.getByRole("button",{name:"Save new password",exact:true})).toHaveCount(0);
});
