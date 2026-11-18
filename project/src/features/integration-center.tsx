"use client";
import { useMemo, useState } from "react";
import { ProviderRegistry, finbaseManifest, crmManifest } from "../integrations/vig/registry";

/** Discovery UI only. Never store grants or credentials in browser storage. */
export function IntegrationCenter({ isOwner }: { isOwner: boolean }) {
  const providers = useMemo(() => {
    const registry = new ProviderRegistry();
    registry.register(finbaseManifest);
    registry.register(crmManifest);
    return registry.list();
  }, []);
  const [selected, setSelected] = useState(providers[0]?.providerId ?? "");
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
    <p style={{fontSize:13,marginTop:18}}>Future products can join through reviewed, versioned manifests and server-side adapters. AI CEO is optional.</p>
  </section>;
}
