import {describe,it,expect,vi,beforeEach} from 'vitest';
import {rpc} from './client';
import {destinationOperation,destinationError} from './finbase-destination';
vi.mock('./client',()=>({rpc:vi.fn()}));
const business='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const config={companyId:'company',companyLabel:'Company',currency:'LKR',revenueCategory:'services'};
const saved={businessId:business,revision:1,status:'draft',config,postingAuthorized:false,updatedAt:'2026-11-19T00:00:00Z'};
beforeEach(()=>vi.mocked(rpc).mockReset());
describe('destination RPC contract',()=>{
 it('requires review confirmation and valid fields before calling the server',async()=>{
  await expect(destinationOperation(business,'save',0,config,false)).rejects.toThrow();
  await expect(destinationOperation(business,'save',0,{...config,currency:'bad'},true)).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
 });
 it('sends the source business and expected version explicitly',async()=>{
  vi.mocked(rpc).mockResolvedValue(saved);
  expect(await destinationOperation(business,'save',0,config,true)).toEqual(saved);
  expect(rpc).toHaveBeenCalledWith('liyanna_finbase_destination',{p_business:business,p_action:'save',p_expected:0,p_config:config,p_confirmed:true});
 });
 it('rejects cross-business responses and any claim of posting authorization',async()=>{
  vi.mocked(rpc).mockResolvedValue({...saved,businessId:crypto.randomUUID()});
  await expect(destinationOperation(business,'read')).rejects.toThrow(/scope_mismatch/);
  vi.mocked(rpc).mockResolvedValue({...saved,postingAuthorized:true});
  await expect(destinationOperation(business,'read')).rejects.toThrow();
 });
 it('rejects inconsistent stored states and sanitizes provider errors',async()=>{
  vi.mocked(rpc).mockResolvedValue({...saved,config:null});
  await expect(destinationOperation(business,'read')).rejects.toThrow(/invalid_destination_response/);
  expect(destinationError(Error('private SQL details password=secret'))).not.toContain('secret');
  expect(destinationError(Error('destination_revision_conflict'))).toContain('Reload');
 });
});
