import test from 'node:test';
import assert from 'node:assert/strict';
import {previewLiyannaSnapshot} from '../../src/modules/integrations/liyanna-preview.ts';
function fixture() {
 return {sourceBusinessId:'949c7003-ec60-432d-b61b-98cf7d763ec6',categoryId:'sales',snapshot:{
 schemaVersion:'liyanna.invoice-snapshot.v1',source:'liyanna',mode:'read-only',postingAuthorized:false,origin:'device',
 businessId:'949c7003-ec60-432d-b61b-98cf7d763ec6',businessName:'Trial',workspaceRevision:null,updatedAt:'2026-11-19T12:00:00.000Z',documentStatus:'unspecified',
 invoices:[{documentId:'7928ef4c-313d-41c2-9432-7948be28c10f',documentNumber:'INV-001',revision:1,issueDate:'2026-11-19',dueDate:'2026-12-19',currency:'LKR',customerName:'Test customer',
 items:[{id:'4b645ea9-039e-4bb2-b218-f09f9f6d5600',description:'Service',quantity:'2',rate:'125.50'}],
 totals:{lines:['251.00'],subtotal:'251.00',discount:'0.00',tax:'0.00',total:'251.00'},updatedAt:'2026-11-19T12:00:00.000Z'}]}};
}
const context={companyCurrency:'LKR',mappingAvailable:true};
test('maps a valid snapshot without authorizing any financial posting',()=>{
 const f=fixture(),before=JSON.stringify(f),r=previewLiyannaSnapshot(f,context);
 assert.equal(r.mode,'review-only');assert.equal(r.postingAuthorized,false);assert.equal(r.mappingPersisted,false);
 assert.equal(r.documents[0].amount,'251.00');assert.deepEqual(r.documents[0].issues,['ISSUANCE_REVIEW_REQUIRED']);
 assert.equal(JSON.stringify(f),before);
});
test('candidate identity is stable per source business document and revision',()=>{
 const a=fixture(),b=fixture();
 assert.equal(previewLiyannaSnapshot(a,context).documents[0].candidateIdempotencyKey,previewLiyannaSnapshot(b,context).documents[0].candidateIdempotencyKey);
 b.snapshot.invoices[0].revision=2;
 assert.notEqual(previewLiyannaSnapshot(a,context).documents[0].candidateIdempotencyKey,previewLiyannaSnapshot(b,context).documents[0].candidateIdempotencyKey);
});
test('rejects source business mismatch and duplicate documents',()=>{
 const f=fixture();f.sourceBusinessId='3898ac7d-c0ca-42c0-aeac-00c869e505bb';
 assert.throws(()=>previewLiyannaSnapshot(f,context),/SOURCE_BUSINESS_MISMATCH/);
 const d=fixture();d.snapshot.invoices.push(structuredClone(d.snapshot.invoices[0]));
 assert.throws(()=>previewLiyannaSnapshot(d,context),/DUPLICATE_SOURCE_DOCUMENT/);
});
test('rejects tampered totals and line values',()=>{
 const f=fixture();f.snapshot.invoices[0].totals.total='250.00';
 assert.throws(()=>previewLiyannaSnapshot(f,context),/INCONSISTENT_SOURCE_TOTALS/);
 const l=fixture();l.snapshot.invoices[0].items[0].rate='100.00';
 assert.throws(()=>previewLiyannaSnapshot(l,context),/INCONSISTENT_SOURCE_TOTALS/);
});
test('flags currency and revenue mapping gaps without changing amounts',()=>{
 const r=previewLiyannaSnapshot(fixture(),{companyCurrency:'USD',mappingAvailable:false});
 assert.ok(r.documents[0].issues.includes('CURRENCY_MAPPING_REQUIRED'));
 assert.ok(r.documents[0].issues.includes('REVENUE_MAPPING_REQUIRED'));
 assert.equal(r.documents[0].amount,'251.00');
});
test('flags missing customer and due date, and tax account mapping',()=>{
 const f=fixture(),d=f.snapshot.invoices[0];d.customerName='';d.dueDate=null as unknown as string;d.totals.tax='10.00';d.totals.total='261.00';
 const r=previewLiyannaSnapshot(f,context);
 for(const issue of ['CUSTOMER_REQUIRED','DUE_DATE_REQUIRED','TAX_ACCOUNT_MAPPING_REQUIRED'])assert.ok(r.documents[0].issues.includes(issue));
});
test('rejects posting claims, unknown fields and impossible dates',()=>{
 const f=fixture();assert.throws(()=>previewLiyannaSnapshot({...f,snapshot:{...f.snapshot,postingAuthorized:true}},context));
 assert.throws(()=>previewLiyannaSnapshot({...f,unexpected:'secret'},context));
 f.snapshot.invoices[0].issueDate='2026-02-30';assert.throws(()=>previewLiyannaSnapshot(f,context));
});
test('rejects zero quantity and excessive invoice count',()=>{
 const f=fixture();f.snapshot.invoices[0].items[0].quantity='0';assert.throws(()=>previewLiyannaSnapshot(f,context),/INVALID_QUANTITY/);
 const many=fixture();many.snapshot.invoices=Array.from({length:101},()=>fixture().snapshot.invoices[0]);
 assert.throws(()=>previewLiyannaSnapshot(many,context));
});
