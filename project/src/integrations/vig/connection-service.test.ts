import { describe, expect, it, vi } from 'vitest';
import { IntegrationService, type IntegrationStore } from './connection-service';
import { ProviderRegistry, finbaseManifest } from './registry';
import type { StoredConnection } from './connection-service';
const connection: StoredConnection = { id:'c', tenantId:'t', businessId:'b', providerId:'finbase', status:'active', allowedCapabilities:[], consentedBy:'owner', consentedAt:'2026-11-18T00:00:00Z', expiresAt:null, revokedAt:null, version:1 };
function setup(owner = true) {
  const store: IntegrationStore = {
    resolvePrincipal: vi.fn(async()=>({userId:'owner',tenantId:'t',businessId:'b',isVerifiedOwner:owner})),
    getConnection: vi.fn(async()=>connection), transition: vi.fn(async()=>true), appendAudit: vi.fn(async()=>{}),
    getGrantedCapabilities: vi.fn(async()=>[{name:'payment:read',requiresApproval:false},{name:'invoice:publish',requiresApproval:true}]),
    verifyActionApproval: vi.fn(async()=>false),
  };
  const registry = new ProviderRegistry(); registry.register(finbaseManifest);
  const execute = vi.fn(async()=>({ok:true}));
  return {store,execute,service:new IntegrationService(store,registry,execute)};
}
describe('server integration service',()=>{
  it('allows scoped read',async()=>{const {service,execute}=setup(); await service.invoke({userId:'owner',businessId:'b',connectionId:'c',capability:'payment:read',payload:{},idempotencyKey:'request_1234567890123'});expect(execute).toHaveBeenCalledOnce();});
  it('denies write without verified approval',async()=>{const {service,execute}=setup();await expect(service.invoke({userId:'owner',businessId:'b',connectionId:'c',capability:'invoice:publish',payload:{},idempotencyKey:'request_1234567890123'})).rejects.toThrow('Approved action');expect(execute).not.toHaveBeenCalled();});
  it('denies unknown capabilities',async()=>{const {service}=setup();await expect(service.invoke({userId:'owner',businessId:'b',connectionId:'c',capability:'delete:all',payload:{},idempotencyKey:'request_1234567890123'})).rejects.toThrow('Unsupported');});
  it('denies non-owner status changes',async()=>{const {service}=setup(false);await expect(service.changeStatus({userId:'owner',businessId:'b',connectionId:'c',event:'suspend'})).rejects.toThrow('Verified owner');});
  it('suspends through atomic transition',async()=>{const {service,store}=setup();await expect(service.changeStatus({userId:'owner',businessId:'b',connectionId:'c',event:'suspend'})).resolves.toEqual({status:'suspended'});expect(store.transition).toHaveBeenCalledOnce();});
});
