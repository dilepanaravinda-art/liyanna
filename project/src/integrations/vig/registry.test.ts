import { describe, expect, it } from "vitest";
import { ProviderRegistry, finbaseManifest, crmManifest } from "./registry";
const grant = {connectionId:"c1",providerId:"finbase",tenantId:"t1",businessId:"b1",enabled:true,approvedByOwner:true,allowedCapabilities:["invoice:publish","payment:read"]};
const request = {providerId:"finbase",tenantId:"t1",businessId:"b1",capability:"invoice:publish",approvedAction:true};
describe("VIG provider-neutral registry", () => {
  it("registers multiple products without modifying LIYANNA core", () => {
    const r = new ProviderRegistry(); r.register(finbaseManifest); r.register(crmManifest);
    expect(r.list().map(p=>p.providerId)).toEqual(["finbase","vantoryx-crm"]);
  });
  it("enforces approval for accounting writes", () => {
    const r = new ProviderRegistry(); r.register(finbaseManifest);
    expect(()=>r.authorize({...request,approvedAction:false},grant)).toThrow("approval");
    expect(()=>r.authorize(request,grant)).not.toThrow();
  });
  it("rejects cross-business access and revoked consent", () => {
    const r = new ProviderRegistry(); r.register(finbaseManifest);
    expect(()=>r.authorize({...request,businessId:"b2"},grant)).toThrow("scope");
    expect(()=>r.authorize(request,{...grant,revokedAt:"2026-11-18T00:00:00Z"})).toThrow("revoked");
  });
  it("rejects capabilities not granted", () => {
    const r = new ProviderRegistry(); r.register(finbaseManifest);
    expect(()=>r.authorize(request,{...grant,allowedCapabilities:["payment:read"]})).toThrow("permitted");
  });
  it("rejects malformed or duplicate provider manifests", () => {
    const r = new ProviderRegistry(); r.register(finbaseManifest);
    expect(()=>r.register(finbaseManifest)).toThrow("already registered");
    expect(()=>r.register({...crmManifest,capabilities:[crmManifest.capabilities[0],crmManifest.capabilities[0]]})).toThrow();
  });
});
