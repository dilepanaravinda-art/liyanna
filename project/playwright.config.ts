import { defineConfig } from "@playwright/test";
export default defineConfig({
 testDir: "./e2e", timeout: 60000, workers: 1,
 use: { baseURL: "http://127.0.0.1:3199", headless: true,
 launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {} },
 webServer: { command: "pnpm dev --port 3199", url: "http://127.0.0.1:3199", reuseExistingServer: false,
 env: { NEXT_PUBLIC_SUPABASE_URL: "https://liyanna-browser-test.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_test_only" } }
});
