"use client";
import { useMemo, useState } from "react";
import type { WorkspaceSnapshot } from "../domain/model";
import { invoiceReviewBatches } from "../integrations/finbase/review-batches";
import { downloadFile } from "../storage/backup";
import { ProviderRegistry, finbaseManifest, crmManifest } from "../integrations/vig/registry";

/** Discovery UI only. Never store grants or credentials in browser storage. */
export function IntegrationCenter({ isOwner, data }: { isOwner: boolean; data: WorkspaceSnapshot }) {
  const providers = useMemo(() => {
    const registry = new ProviderRegistry();
    registry.register(finbaseManifest);
    registry.register(crmManifest);
    return registry.list();
  }, []);
  const [selected, setSelected] = useState(providers[0]?.providerId ?? "");
  const [handoffError,setHandoffError]=useState("");
  const [batchIndex, setBatchIndex] = useState(0);
  const review = useMemo(() => {
    if (!isOwner) return {result: null, error: ""};
    try { return {result: invoiceReviewBatches(data), error: ""}; }
    catch (error) { return {result: null, error: error instanceof Error ? error.message : "Check workspace data before exporting."}; }
  }, [data, isOwner]);
  const selectedBatch = Math.min(batchIndex, Math.max(0, (review.result?.batches.length ?? 0) - 1));
  const provider = providers.find(p => p.providerId === selected);
  return <section aria-labelledby="integrations-title" style={{maxWidth:1000}}>
    <div className="heading"><div><h1 id="integrations-title">Integrations</h1><p>Explore compatible Vantoryx products and their available capabilities.</p></div></div>
    <div className="notice" role="status" style={{marginBottom:20}}>
      Preview only — no live connections are configured. Connecting products will require a verified server-side authorization service and explicit owner consent.
    </div>
    {!isOwner && <p className="notice">Only a workspace owner can manage integration connections.</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14,marginBottom:20}}>
      {providers.map(p => <button key={p.providerId} type="button" onClick={() => setSelected(p.providerId)} aria-pressed={selected===p.providerId} style={{textAlign:"left",padding:18,borderRadius:14,border:selected===p.providerId?"2px solid #176b65":"1px solid #cbd5d1",background:"transparent"}}>
        <strong>{p.displayName}</strong><p style={{margin:"8px 0",fontSize:13}}>Contract v{p.contractVersion}</p><span style={{fontSize:12}}>Not connected · {p.capabilities.length} capabilities</span>
      </button>)}
    </div>
    {provider && <div style={{border:"1px solid #cbd5d1",borderRadius:14,padding:20}}>
      <h2 style={{fontSize:20,marginTop:0}}>{provider.displayName} capabilities</h2>
      <p style={{fontSize:13}}>These capabilities describe the proposed integration contract. They do not grant access or activate synchronization.</p>
      <ul style={{paddingLeft:20}}>{provider.capabilities.map(c => <li key={c.name} style={{marginBottom:14}}><strong>{c.name}</strong> ({c.direction}){c.requiresApproval?" · Approval required":""}<div style={{fontSize:13}}>{c.description}</div></li>)}</ul>
      <button type="button" disabled title="Server-side integration provisioning is not yet available" className="btn">Connect — coming soon</button>
    </div>}
    {provider?.providerId === "finbase" && isOwner && <section className="panel" aria-label="Invoice handoff" style={{marginTop:20}}>
      <h2>Invoice snapshot for review</h2>
      <p>Download this device’s invoice records and calculated totals as JSON. This is a read-only review file, not an issued-invoice event or permission to post transactions in FINBASE. Unsynced device edits may differ from the cloud.</p>
      {review.error && <p role="alert">{review.error}</p>}
      {review.result && <>
        <p>{review.result.invoiceCount} invoice record(s) · {review.result.batches.length} review file(s)</p>
        <p>Source currencies: {review.result.currencies.join(", ") || "None"}. Confirm the target company and income mapping in FINBASE.</p>
        <h3>Before importing</h3>
        <p>These checks identify source data to review. Every invoice still needs issuance approval; this checklist does not authorize an import.</p>
        <ul>{review.result.checks.filter(check => check.count > 0).map(check => <li key={check.label}>{check.label}: {check.count}</li>)}</ul>
        {review.result.batches.length > 1 && <label>Review file <select aria-label="Review file" value={selectedBatch} onChange={event => setBatchIndex(Number(event.target.value))}>
          {review.result.batches.map((batch, index) => <option key={index} value={index}>File {index + 1} of {review.result!.batches.length} · {batch.invoices.length} invoices</option>)}
        </select></label>}
        <button type="button" className="btn" disabled={!review.result.batches.length} onClick={() => {
          try {
            const snapshot = review.result!.batches[selectedBatch];
            downloadFile(JSON.stringify(snapshot), review.result!.batches.length === 1 ? "liyanna-invoice-snapshot.json" : `liyanna-invoice-snapshot-${selectedBatch + 1}.json`);
            setHandoffError("");
          } catch {setHandoffError("Unable to download the review file. Try again.");}
        }}>Download invoice snapshot</button>
        {!review.result.invoiceCount && <p>Create an invoice to prepare a review file.</p>}
      </>}
      {handoffError && <p role="alert">{handoffError}</p>}
    </section>}
    <p style={{fontSize:13,marginTop:18}}>Future products can join through reviewed, versioned manifests and server-side adapters. AI CEO is optional.</p>
  </section>;
}
