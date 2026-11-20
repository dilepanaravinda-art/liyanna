'use client';
import React,{useEffect,useRef,useState} from 'react';
type Result={mode:'review-only';postingAuthorized:false;mappingPersisted:false;documentCount:number;documents:Array<{documentId:string;documentNumber:string;sourceCurrency:string;companyCurrency:string;amount:string;issues:string[]}>};
const reviewLabels:Record<string,string>={
 ISSUANCE_REVIEW_REQUIRED:'Confirm invoice issuance and approval',
 CURRENCY_MAPPING_REQUIRED:'Source and company currencies differ',
 CURRENCY_PRECISION_REVIEW_REQUIRED:'Review currency decimal precision',
 REVENUE_MAPPING_REQUIRED:'Configure an income account mapping',
 CUSTOMER_REQUIRED:'Add a customer name',
 CUSTOMER_NAME_REVIEW_REQUIRED:'Review the customer name length',
 DUE_DATE_REQUIRED:'Add an invoice due date',
 INVALID_DUE_DATE:'Due date precedes the invoice date',
 TAX_ACCOUNT_MAPPING_REQUIRED:'Confirm the tax account mapping',
 POSITIVE_AMOUNT_REQUIRED:'Invoice total must be greater than zero',
};
export default function LiyannaPreview({api,preview=false,mappings=[]}:{api:(path:string,body?:unknown)=>Promise<unknown>;preview?:boolean;mappings?:Array<{category:string}>}) {
 const [snapshot,setSnapshot]=useState<Record<string,unknown>|null>(null),[businessId,setBusinessId]=useState(''),[category,setCategory]=useState(''),[fileName,setFileName]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 const revision=useRef(0);
 useEffect(()=>()=>{revision.current++;},[]);
 useEffect(()=>{revision.current++;if(preview){setSnapshot(null);setResult(null);setConsent(false);setFileName('');setBusinessId('');setBusy(false);setError('');}},[preview]);
 async function choose(file:File|undefined) {
  const token=++revision.current;setSnapshot(null);setResult(null);setConsent(false);setError('');setBusinessId('');setFileName('');
  if(!file||preview)return;
  try {
   if(file.size>60000)throw Error('Use a snapshot under 60 KB for this review.');
   const value=JSON.parse(await file.text());
   if(token!==revision.current)return;
   if(!value||value.schemaVersion!=='liyanna.invoice-snapshot.v1'||value.postingAuthorized!==false||typeof value.businessId!=='string'||!Array.isArray(value.invoices))throw Error('Choose a LIYANNA invoice snapshot exported from Integrations.');
   setSnapshot(value);setBusinessId(value.businessId);setFileName(file.name);
  }catch(e){if(token===revision.current)setError(e instanceof Error?e.message:'Unable to read this file.');}
 }
 async function submit(event:React.FormEvent) {
  event.preventDefault();if(preview||busy||!snapshot||!category||!consent)return;
  const token=++revision.current;setBusy(true);setError('');setResult(null);
  try {
   const body={sourceBusinessId:businessId,categoryId:category,snapshot};
   if(JSON.stringify(body).length>65000)throw Error('This snapshot is too large for the review endpoint.');
   const value=await api('integrations/liyanna/preview',body) as Result;
   if(token!==revision.current)return;
   if(value?.mode!=='review-only'||value.postingAuthorized!==false||value.mappingPersisted!==false||!Array.isArray(value.documents)||value.documentCount!==value.documents.length||value.documents.some(d=>!d||typeof d.documentId!=='string'||typeof d.documentNumber!=='string'||typeof d.amount!=='string'||typeof d.sourceCurrency!=='string'||typeof d.companyCurrency!=='string'||!Array.isArray(d.issues)||d.issues.some(i=>typeof i!=='string')))throw Error('The review response could not be verified.');
   setResult(value);
  }catch(e){if(token===revision.current)setError(e instanceof Error?e.message:'Unable to review this snapshot.');}
  finally{if(token===revision.current)setBusy(false);}
 }
 return <section className="panel" aria-label="LIYANNA file review" style={{margin:'20px 0',padding:20}}>
  <h2>Review a LIYANNA invoice snapshot</h2>
  <p>Check invoice totals and mapping requirements for the selected FINBASE company. This review creates no sales, journal entries or saved business mappings.</p>
  {preview&&<p role="status">Sign in and select company scope to review a file.</p>}
  <form onSubmit={e=>void submit(e)}>
   <label>LIYANNA JSON file<input aria-label="LIYANNA JSON file" type="file" accept=".json,application/json" disabled={preview||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void choose(file);}}/></label>
   {fileName&&<p>{fileName} · {Array.isArray(snapshot?.invoices)?snapshot.invoices.length:0} invoice record(s)</p>}
   <label>Source LIYANNA business ID<input aria-label="Source LIYANNA business ID" value={businessId} disabled={preview||busy} required onChange={e=>{setBusinessId(e.target.value);setResult(null);setConsent(false);}}/></label>
   <label>FINBASE revenue category<select aria-label="FINBASE revenue category" value={category} disabled={preview||busy} required onChange={e=>{setCategory(e.target.value);setResult(null);setConsent(false);}}>
    <option value="">Select an income mapping</option>{mappings.map(m=><option key={m.category} value={m.category}>{m.category}</option>)}
   </select></label>
   {!mappings.length&&<p>Configure an income mapping in company accounting setup before reviewing.</p>}
   <label><input aria-label="Send snapshot for review" type="checkbox" checked={consent} disabled={preview||busy||!snapshot} onChange={e=>setConsent(e.target.checked)}/>Send this snapshot to the selected FINBASE company for review only.</label>
   <button className="primary" aria-label="Preview invoice mapping" disabled={preview||busy||!snapshot||!category||!consent}>{busy?'Reviewing…':'Preview mapping'}</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {result&&<div role="status"><h3>{result.documentCount} record(s) reviewed — not imported</h3><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Amount</th><th>Company currency</th><th>Review requirements</th></tr></thead><tbody>{result.documents.map(d=><tr key={d.documentId}><td>{d.documentNumber}</td><td>{d.sourceCurrency} {d.amount}</td><td>{d.companyCurrency}</td><td>{d.issues.map(issue=>reviewLabels[issue]??'Additional review required').join('; ')||'No validation gaps reported; posting remains disabled.'}</td></tr>)}</tbody></table></div><p>Draft/issuance review and a separate approved import workflow are still required. Nothing has been posted.</p></div>}
 </section>;
}
