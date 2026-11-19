"use client";
import {useEffect,useRef,useState} from "react";
import {destinationOperation,destinationError,destinationConfigSchema,type Destination,type DestinationConfig} from "../cloud/finbase-destination";
export function FinbaseDestination({businessId,currency}:{businessId:string;currency:string}) {
 const [saved,setSaved]=useState<Destination|null>(null);
 const [form,setForm]=useState<DestinationConfig>({companyId:"",companyLabel:"",currency,revenueCategory:""});
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const live=useRef(true),generation=useRef(0);
 useEffect(()=>{live.current=true;void load();return()=>{live.current=false;generation.current++;};},[]);
 async function load() {
  const operation=++generation.current;
  setBusy(true);setError("");setNotice("");setConfirmed(false);
  try {const value=await destinationOperation(businessId,'read');if(!live.current||operation!==generation.current)return;setSaved(value);if(value.config)setForm(value.config);}
  catch(error) {if(live.current&&operation===generation.current){setSaved(null);setError(destinationError(error));}}
  finally {if(live.current&&operation===generation.current)setBusy(false);}
 }
 async function change(action:'save'|'revoke') {
  if(!saved||busy)return;
  if(action==='save'&&(!confirmed||!destinationConfigSchema.safeParse(form).success))return;
  const operation=++generation.current;
  setBusy(true);setError("");setNotice("");
  try {
   const value=await destinationOperation(businessId,action,saved.revision,action==='save'?form:undefined,confirmed);
   if(!live.current||operation!==generation.current)return;setSaved(value);if(value.config)setForm(value.config);setConfirmed(false);
   setNotice(action==='save'?'Review destination saved. Verify these references in FINBASE before using them.':'Saved destination revoked. Previously downloaded files are unaffected.');
  } catch(error){if(live.current&&operation===generation.current){setError(destinationError(error));setSaved(null);setConfirmed(false);}}
  finally {if(live.current&&operation===generation.current)setBusy(false);}
 }
 function edit(key:keyof DestinationConfig,value:string){setForm(current=>({...current,[key]:value}));setConfirmed(false);setNotice("");}
 return <section className="panel" aria-labelledby="destination-title" style={{marginTop:20}}>
  <h2 id="destination-title">FINBASE review destination</h2>
  <p>Save the company and income mapping references for this business. These are draft settings; FINBASE access and account validity must be verified separately.</p>
  <p>Source business ID: <code style={{overflowWrap:"anywhere"}}>{businessId}</code></p>
  {saved&&<p role="status">{saved.status==='draft'?'Draft settings saved':saved.status==='revoked'?'Destination revoked':'No saved destination'} · Version {saved.revision}</p>}
  <fieldset disabled={busy||!saved} style={{border:0,padding:0,display:"grid",gap:12}}>
   <label>Destination name<input maxLength={100} value={form.companyLabel} onChange={e=>edit('companyLabel',e.target.value)} placeholder="Company name in FINBASE" /></label>
   <label>FINBASE company ID<input maxLength={100} value={form.companyId} onChange={e=>edit('companyId',e.target.value)} autoComplete="off" /></label>
   <label>Company currency<input maxLength={3} value={form.currency} onChange={e=>edit('currency',e.target.value.toUpperCase())} /></label>
   <label>Income mapping ID<input maxLength={100} value={form.revenueCategory} onChange={e=>edit('revenueCategory',e.target.value)} autoComplete="off" /></label>
   <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} /> I reviewed these destination references. Saving does not authorize imports or financial posting.</label>
  </fieldset>
  <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:16}}>
   <button type="button" className="btn" disabled={busy||!saved||!confirmed||!destinationConfigSchema.safeParse(form).success} onClick={()=>void change('save')}>Save review destination</button>
   <button type="button" className="btn" disabled={busy} onClick={()=>void load()}>Reload destination settings</button>
   <button type="button" className="btn" disabled={busy||saved?.status!=='draft'} onClick={()=>void change('revoke')}>Revoke saved destination</button>
  </div>
  {busy&&<p role="status">Loading destination settings…</p>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section>;
}
