import { describe, expect, it } from "vitest";
import { authorizeConnectionManagement, authorizeIntegrationCapability, type IntegrationConnection, type IntegrationPrincipal } from "./connection-policy";
const principal: IntegrationPrincipal = {userId:"u1",tenantId:"t1",businessId:"b1",isVerifiedOwner:true};
const connection: IntegrationConnection = {id:"c1",tenantId:"t1",businessId:"b1",providerId:"finbase",status:"active",allowedCapabilities:["payment:read","invoice:publish"],consentedBy:"u1",consentedAt:"2026-11-01T00:00:00Z",expiresAt:null,revokedAt:null};
describe("integration authorization", () => {
  it("permits scoped read",()=>expect(()=>authorizeIntegrationCapability(principal,connection,"payment:read",false,false)).not.toThrow());
  it("denies cross-tenant access",()=>expect(()=>authorizeIntegrationCapability({...principal,tenantId:"other"},connection,"payment:read",false,false)).toThrow());
  it("denies ungranted capabilities",()=>expect(()=>authorizeIntegrationCapability(principal,connection,"customer:delete",false,false)).toThrow());
  it("denies unapproved writes",()=>expect(()=>authorizeIntegrationCapability(principal,connection,"invoice:publish",true,false)).toThrow());
  it("denies revoked connections",()=>expect(()=>authorizeIntegrationCapability(principal,{...connection,revokedAt:"2026-11-10T00:00:00Z"},"payment:read",false,false)).toThrow());
  it("denies expired consent",()=>expect(()=>authorizeIntegrationCapability(principal,{...connection,expiresAt:"2026-11-10T00:00:00Z"},"payment:read",false,false,new Date("2026-11-18T00:00:00Z"))).toThrow());
  it("requires verified owner for changes",()=>expect(()=>authorizeConnectionManagement({...principal,isVerifiedOwner:false},connection,"disconnect")).toThrow());
  it("allows verified owner to disconnect",()=>expect(()=>authorizeConnectionManagement(principal,connection,"disconnect")).not.toThrow());
});
