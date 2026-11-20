import { describe, expect, it } from "vitest";
import { nextConnectionStatus } from "./connection-state";
import type { IntegrationConnection } from "./connection-policy";
const base: IntegrationConnection = {id:"c",tenantId:"t",businessId:"b",providerId:"finbase",status:"pending",allowedCapabilities:[],consentedBy:"owner",consentedAt:"2026-11-18T00:00:00Z",expiresAt:null,revokedAt:null};
describe("connection lifecycle", () => {
 it("activates pending consent",()=>expect(nextConnectionStatus(base,"activate")).toBe("active"));
 it("suspends active",()=>expect(nextConnectionStatus({...base,status:"active"},"suspend")).toBe("suspended"));
 it("resumes suspended",()=>expect(nextConnectionStatus({...base,status:"suspended"},"resume")).toBe("active"));
 it("revokes pending",()=>expect(nextConnectionStatus(base,"revoke")).toBe("revoked"));
 it("rejects repeated activation",()=>expect(()=>nextConnectionStatus({...base,status:"active"},"activate")).toThrow());
 it("rejects revoked",()=>expect(()=>nextConnectionStatus({...base,status:"revoked",revokedAt:"2026-11-18T01:00:00Z"},"activate")).toThrow());
 it("rejects expired consent",()=>expect(()=>nextConnectionStatus({...base,expiresAt:"2020-01-01T00:00:00Z"},"activate")).toThrow());
 it("rejects absent consent",()=>expect(()=>nextConnectionStatus({...base,consentedBy:""},"activate")).toThrow());
});
