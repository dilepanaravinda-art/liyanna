/**
 * Read-only live acceptance check. Supply a dedicated test account through environment variables.
 * Does not create users, send recovery email, edit workspaces or activate integrations.
 */
import { createClient } from "@supabase/supabase-js";
const required = ["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","LIYANNA_TEST_EMAIL","LIYANNA_TEST_PASSWORD"];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
 console.error("Live account check requires: " + missing.join(", "));
 process.exit(2);
}
const clients = [0,1].map(() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));
async function check() {
 const users = [];
 for (const client of clients) {
   const login = await client.auth.signInWithPassword({email:process.env.LIYANNA_TEST_EMAIL,password:process.env.LIYANNA_TEST_PASSWORD});
   if(login.error || !login.data.user) throw Error("Live sign-in failed");
   const verified = await client.auth.getUser();
   if(verified.error || verified.data.user?.id!==login.data.user.id) throw Error("Live session verification failed");
   users.push(verified.data.user.id);
 }
 if(users[0]!==users[1]) throw Error("Account mismatch across sessions");
 const memberships=await Promise.all(clients.map(client=>client.from("liyanna_businesses").select("id")));
 if(memberships.some(result=>result.error)) throw Error("Business access failed");
 const ids=memberships.map(result=>(result.data??[]).map(row=>row.id).sort());
 if(JSON.stringify(ids[0])!==JSON.stringify(ids[1])) throw Error("Business scope mismatch across sessions");
 const business=process.env.LIYANNA_TEST_BUSINESS_ID;
 if(business) {
   if(!ids[0].includes(business)) throw Error("Selected test business is not available to this account");
   const workspaces=await Promise.all(clients.map(client=>client.rpc("liyanna_read_workspace",{p_business:business})));
   if(workspaces.some(result=>result.error)) throw Error("Workspace read failed");
   if(JSON.stringify(workspaces[0].data)!==JSON.stringify(workspaces[1].data)) throw Error("Workspace changed between reads; retry when no edits are in progress");
 }
 console.log("PASS: live password authentication, two verified sessions, matching business scope" + (business?", matching workspace reads":""));
 console.log("Not tested: recovery email delivery, writes, browser-to-cloud updates, FINBASE.");
}
try { await check(); }
catch(error) { console.error("FAIL: " + error.message); process.exitCode=1; }
finally { await Promise.allSettled(clients.map(client=>client.auth.signOut({scope:"local"}))); }
