"use client";
import {useEffect,useRef,useState} from 'react';
import type {WorkspaceSnapshot} from '../domain/model';
import {destinationOperation,type Destination} from '../cloud/finbase-destination';
import {readReviewReceipts,prepareReviewEvent,reviewPreparationError,type ReviewReceipt} from '../cloud/finbase-review';
import {downloadFile} from '../storage/backup';
export function FinbaseReview({data}:{data:WorkspaceSnapshot}){
 const [destination,setDestination]=useState<Destination|null>(null),[receipts,setReceipts]=useState<ReviewReceipt[]>([]);
 const [documentId,setDocumentId]=useState(''),[customerId,setCustomerId]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const generation=useRef(0);
 const document=data.documents.find(d=>d.id===documentId&&d.type==='invoice');
 const customers=data.customers.filter(c=>document&&c.name===document.customer.name&&c.email===document.customer.email&&c.phone===document.customer.phone);
 useEffect(()=>{void reload();return()=>{generation.current++;};},[]);
 useEffect(()=>{setConfirmed(false);},[document?.revision,destination?.revision]);
 async function reload(){
  const operation=++generation.current;setBusy(true);setError('');setNotice('');setConfirmed(false);
  try{const [target,history]=await Promise.all([destinationOperation(data.business.id,'read'),readReviewReceipts(data.business.id)]);if(operation!==generation.current)return;setDestination(target);setReceipts(history);}
  catch(error){if(operation===generation.current){setDestination(null);setReceipts([]);setError(reviewPreparationError(error));}}
  finally{if(operation===generation.current)setBusy(false);}
 }
 async function prepare(){
  if(!document||!destination||destination.status!=='draft'||!customers.some(c=>c.id===customerId)||!confirmed||busy)return;
  const operation=++generation.current;setBusy(true);setError('');setNotice('');
  try{
   const result=await prepareReviewEvent({businessId:data.business.id,documentId:document.id,documentRevision:document.revision,destinationRevision:destination.revision,customerId,confirmed});
   if(operation!==generation.current)return;
   setReceipts(current=>[result.receipt,...current.filter(r=>r.id!==result.receipt.id)].slice(0,30));setConfirmed(false);
   setNotice(result.duplicate?'Existing review event reused. Its ID and payload are unchanged.':'Cloud review event prepared. Download it for FINBASE staging review.');
  }catch(error){if(operation===generation.current){setError(reviewPreparationError(error));setConfirmed(false);}}
  finally{if(operation===generation.current)setBusy(false);}
 }
 return <section className="panel" aria-labelledby="review-events-title" style={{marginTop:20}}>
  <h2 id="review-events-title">Cloud review events</h2>
  <p>Prepare an invoice for FINBASE’s review inbox. The cloud saves one event identity per invoice revision so retries can reuse the exact file. Preparing a file does not prove issuance, send data, or authorize accounting entries.</p>
  <p>Use this business ID for both source tenant and source business when declaring the FINBASE sandbox mapping: <code style={{overflowWrap:'anywhere'}}>{data.business.id}</code></p>
  {destination&&<p>Review destination: {destination.config?.companyLabel||'Not saved'} · Version {destination.revision} · {destination.status}</p>}
  <fieldset disabled={busy||destination?.status!=='draft'} style={{display:'grid',gap:12,border:0,padding:0}}>
   <label>Invoice for cloud review<select value={documentId} onChange={e=>{setDocumentId(e.target.value);setCustomerId('');setConfirmed(false);}}><option value="">Choose an invoice</option>{data.documents.filter(d=>d.type==='invoice').map(d=><option key={d.id} value={d.id}>{d.number} · Revision {d.revision}</option>)}</select></label>
   <label>Matching customer record<select value={customerId} onChange={e=>{setCustomerId(e.target.value);setConfirmed(false);}}><option value="">Choose a synced customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   {document&&!customers.length&&<p>Add a customer record matching the invoice’s name, email and phone, then sync both records to the cloud.</p>}
   <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I reviewed this invoice and destination for staging only.</label>
  </fieldset>
  <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:16}}>
   <button type="button" className="btn" disabled={busy||!confirmed||!document||!customers.some(c=>c.id===customerId)||destination?.status!=='draft'} onClick={()=>void prepare()}>Prepare cloud review event</button>
   <button type="button" className="btn" disabled={busy} onClick={()=>void reload()}>Reload review events</button>
  </div>
  {busy&&<p role="status">Loading cloud review events…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <h3>Prepared events</h3>
  <p>History retains the original invoice and destination revision. Revoking a destination blocks new preparation; previously downloaded files remain available.</p>
  {!receipts.length&&<p>No prepared events loaded.</p>}
  <ul>{receipts.map(receipt=><li key={receipt.id} style={{marginBottom:16}}>
   <strong>{receipt.event.documentNumber}</strong> · Revision {receipt.event.revision} · {receipt.event.currency} {receipt.event.total}<br/>
   <span>{receipt.destination.companyLabel} · Destination version {receipt.destinationRevision}</span><br/>
   <button type="button" className="btn" onClick={()=>downloadFile(JSON.stringify(receipt.event),`liyanna-review-event-${receipt.id}.json`)}>Download review event {receipt.event.documentNumber}</button>
  </li>)}</ul>
 </section>;
}
