"use client";
import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import type { WorkspaceSnapshot } from "../domain/model";
import { calculate, formatMoney } from "../domain/money";

/** Read-only dashboard over the active workspace; no invented payment or lifecycle statuses. */
export function CommercialDashboard({ data }: { data: WorkspaceSnapshot }) {
  const [kind, setKind] = useState<"all" | "invoice" | "quote">("all");
  const [query, setQuery] = useState("");
  const report = useMemo(() => {
    const totals = new Map<string, { invoices: Decimal; quotations: Decimal; invoiceCount: number; quoteCount: number }>();
    const rows: { id: string; number: string; type: string; customer: string; currency: string; total: string; date: string }[] = [];
    const invalid: string[] = [];
    for (const doc of data.documents) {
      if (doc.businessId !== data.business.id) continue;
      try {
        const total = calculate({currency: doc.currency, items: doc.items, discountKind: doc.discountKind, discount: doc.discount, tax: doc.tax, taxKind: doc.taxKind}).total;
        const bucket = totals.get(doc.currency) ?? { invoices: new Decimal(0), quotations: new Decimal(0), invoiceCount: 0, quoteCount: 0 };
        if (doc.type === "invoice") { bucket.invoices = bucket.invoices.plus(total); bucket.invoiceCount++; }
        else { bucket.quotations = bucket.quotations.plus(total); bucket.quoteCount++; }
        totals.set(doc.currency, bucket);
        rows.push({ id: doc.id, number: doc.number, type: doc.type, customer: doc.customer.name, currency: doc.currency, total, date: doc.issueDate });
      } catch { invalid.push(doc.number || doc.id); }
    }
    return { totals: [...totals.entries()].sort(([a],[b]) => a.localeCompare(b)), rows: rows.sort((a,b) => b.date.localeCompare(a.date)), invalid };
  }, [data]);
  const visible = report.rows.filter(row => (kind === "all" || row.type === kind) && `${row.number} ${row.customer}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="commercial-dashboard" aria-label="Commercial overview">
    <div className="commercial-heading"><div><h1>Commercial overview</h1><p>Read-only totals from saved workspace documents. Values are grouped by currency.</p></div></div>
    <div className="commercial-metrics">{report.totals.length ? report.totals.map(([currency, value]) => <div className="commercial-metric" key={currency}><strong>{currency}</strong><div><small>Invoices · {value.invoiceCount}</small><b>{formatMoney(value.invoices.toString(),currency)}</b></div><div><small>Quotations · {value.quoteCount}</small><b>{formatMoney(value.quotations.toString(),currency)}</b></div></div>) : <p>No saved documents yet.</p>}</div>
    <div className="commercial-note">These are document face values, not confirmed revenue, outstanding balances, collections, or accepted quotations. Payment and approval statuses are not stored in the current workspace model.</div>
    {report.invalid.length > 0 && <p role="alert" className="commercial-warning">{report.invalid.length} document(s) excluded because their amounts could not be validated: {report.invalid.slice(0,5).join(", ")}{report.invalid.length>5 ? "…" : ""}.</p>}
    <div className="commercial-toolbar"><label>Document type <select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="all">All</option><option value="invoice">Invoices</option><option value="quote">Quotations</option></select></label><label>Search <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Customer or document number" /></label></div>
    <div className="commercial-table-wrap"><table className="commercial-table"><thead><tr><th>Number</th><th>Type</th><th>Customer</th><th>Issue date</th><th>Value</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td>{row.number}</td><td>{row.type === "quote" ? "Quotation" : "Invoice"}</td><td>{row.customer || "—"}</td><td>{row.date}</td><td>{formatMoney(row.total,row.currency)}</td></tr>)}{visible.length===0 && <tr><td colSpan={5}>No matching documents.</td></tr>}</tbody></table></div>
  </section>;
}
