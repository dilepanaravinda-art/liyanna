import { describe,it,expect } from "vitest";
import { emptyWorkspace, blankDocument } from "../../domain/model";
import { invoiceHandoff } from "./handoff";
import { handleInvoiceHandoff } from "./handoff-handler";
function fixture() {
 const ws=emptyWorkspace();ws.business.name="Snapshot trial";ws.business.currency="LKR";
 const invoice=blankDocument(ws.business,"invoice","INV-001");
 invoice.customer.name="Customer";invoice.items[0].description="Service";invoice.items[0].quantity="2";invoice.items[0].rate="125.50";
 ws.documents=[invoice,blankDocument(ws.business,"quote","QUO-001")];return ws;
}
describe("read-only invoice handoff",()=>{
 it("exports invoices with exact totals without inventing issued status",()=>{
  const ws=fixture(), before=JSON.stringify(ws), out=invoiceHandoff(ws,"device");
  expect(out.invoices).toHaveLength(1);expect(out.invoices[0].totals.total).toBe("251.00");
  expect(out.postingAuthorized).toBe(false);expect(out.documentStatus).toBe("unspecified");
  expect(JSON.stringify(ws)).toBe(before);
 });
 it("rejects records from a different business",()=>{
  const ws=fixture();ws.documents[0].businessId=crypto.randomUUID();
  expect(()=>invoiceHandoff(ws,"device")).toThrow();
 });
 const request=(id:string,token="valid")=>new Request("https://liyanna.test/api/integrations/finbase/invoices?businessId="+id,{headers:token?{Authorization:"Bearer "+token}:{}});
 it("rejects missing or invalid auth before reading any workspace",async()=>{
  let reads=0;const ws=fixture();
  const deps={authenticate:async()=>false,load:async()=>{reads++;return null;}};
  expect((await handleInvoiceHandoff(request(ws.business.id,""),deps)).status).toBe(401);
  expect((await handleInvoiceHandoff(request(ws.business.id),deps)).status).toBe(401);
  expect(reads).toBe(0);
 });
 it("requires an owner response matching the requested business",async()=>{
  const ws=fixture(),deps={authenticate:async()=>true,load:async()=>({role:"staff",scope:"all",revision:0,snapshot:ws})};
  expect((await handleInvoiceHandoff(request(ws.business.id),deps)).status).toBe(403);
  deps.load=async()=>({role:"owner",scope:"owner",revision:0,snapshot:ws});
  expect((await handleInvoiceHandoff(request(crypto.randomUUID()),deps)).status).toBe(403);
 });
 it("returns an uncached owner snapshot with the cloud revision",async()=>{
  const ws=fixture();const response=await handleInvoiceHandoff(request(ws.business.id),{authenticate:async()=>true,load:async()=>({role:"owner",scope:"owner",revision:7,snapshot:ws})});
  expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("vary")).toBe("Authorization");
  const result=await response.json();expect(result.workspaceRevision).toBe(7);expect(result.postingAuthorized).toBe(false);
 });
 it("does not expose provider errors or credentials",async()=>{
  const ws=fixture();const response=await handleInvoiceHandoff(request(ws.business.id),{authenticate:async()=>{throw Error("private credential");},load:async()=>null});
  expect(response.status).toBe(503);expect(await response.text()).not.toContain("private credential");
 });
 it("rejects invalid business IDs and writes without reading records",async()=>{
  let reads=0;const deps={authenticate:async()=>true,load:async()=>{reads++;return null;}};
  expect((await handleInvoiceHandoff(request("bad"),deps)).status).toBe(400);
  expect((await handleInvoiceHandoff(new Request("https://liyanna.test/api",{method:"POST"}),deps)).status).toBe(405);
  expect(reads).toBe(0);
 });
});
