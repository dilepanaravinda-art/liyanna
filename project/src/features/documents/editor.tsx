"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  Download,
  Save,
  PlusCircle,
  Trash2,
  Check,
  ChevronDown,
} from "lucide-react";
import { uid, type Document, type WorkspaceSnapshot } from "../../domain/model";
import { calculate, formatMoney } from "../../domain/money";
import { draftSchema, documentSchema } from "../../domain/validation";
import type { Copy } from "../../i18n";
import { CurrencySelect, LanguageSelect, Field, ErrorBox } from "../components";
import { DocumentPreview } from "./preview";
export function Editor({
  initial,
  data,
  t,
  onSave,
  onBack,
  onDirty,
  onPrepareDownload,
}: {
  initial: Document;
  data: WorkspaceSnapshot;
  t: Copy;
  onSave: (d: Document) => Promise<Document>;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
  onPrepareDownload: (d: Document) => Promise<Document>;
}) {
  const [d, setD] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [dirty, setDirty] = useState(
      !data.documents.some((x) => x.id === initial.id),
    ),
    [tab, setTab] = useState("edit");
  const previousAppLanguage = useRef(data.business.language);
  useEffect(() => {
    if (previousAppLanguage.current !== data.business.language) {
      previousAppLanguage.current = data.business.language;
      setD((current) => ({ ...current, language: data.business.language }));
      setDirty(true);
    }
  }, [data.business.language]);
  useEffect(() => {
    onDirty(dirty);
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty && !busy) {
      const saved = data.documents.find((v) => v.id === d.id);
      if (saved) setD(structuredClone(saved));
    }
  }, [data.documents, dirty, busy, d.id]);
  const patch = (v: Partial<Document>) => {
    setD((p) => ({ ...p, ...v }));
    setDirty(true);
  };
  let totals;
  try {
    totals = calculate(d);
  } catch {
    totals = { lines: d.items.map(() => "0"), total: "0" };
  }
  async function save() {
    const checked = draftSchema.safeParse(d);
    if (!checked.success) throw Error(checked.error.issues[0].message);
    const saved = await onSave(checked.data);
    setD(saved);
    setDirty(false);
    return saved;
  }
  async function run(kind: string) {
    setError("");
    setBusy(kind);
    try {
      if (kind === "pdf") {
        const checked = documentSchema.safeParse(d);
        if (!checked.success) throw Error(checked.error.issues[0].message);
        const saved = await save();
        const { downloadDocument } = await import("../../pdf/render");
        const canonical = await onPrepareDownload(saved);
        setD(canonical);
        await downloadDocument(canonical);
      } else await save();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy("");
    }
  }
  const itemPatch = (id: string, v: Partial<Document["items"][number]>) =>
    patch({ items: d.items.map((i) => (i.id === id ? { ...i, ...v } : i)) });
  return (
    <>
      <div className="heading">
        <div>
          <button
            className="btn text"
            style={{ fontSize: 10, marginBottom: 6 }}
            onClick={onBack}
          >
            <ArrowLeft size={12} />
            {t.back}
          </button>
          <h1>
            {t.createTitle} {t[d.type].toLowerCase()}
          </h1>
          <p>{t.subtitle}</p>
          <div className={"saved-state " + (dirty ? "dirty" : "")}>
            <Check size={11} />
            {busy === "save" ? t.saving : dirty ? t.unsaved : t.saved}
          </div>
        </div>
        <div className="row">
          <button className="btn" disabled={!!busy} onClick={() => run("save")}>
            <Save size={15} />
            {t.saveDraft}
          </button>
          <button
            className="btn primary"
            disabled={!!busy}
            onClick={() => run("pdf")}
          >
            <Download size={15} />
            {busy === "pdf" ? t.downloadBusy : t.download}
          </button>
        </div>
      </div>
      {error && <ErrorBox message={error} onClose={() => setError("")} />}
      <div className="tabs mobile-tabs">
        <button
          onClick={() => setTab("edit")}
          className={tab === "edit" ? "active" : ""}
        >
          {t.edit}
        </button>
        <button
          onClick={() => setTab("preview")}
          className={tab === "preview" ? "active" : ""}
        >
          {t.preview}
        </button>
      </div>
      <div className={"editor-grid show-" + tab}>
        <fieldset className="panel editor-form" disabled={!!busy}>
          <div className="tabs type-tabs">
            {(["invoice", "quote"] as const).map((type) => (
              <button
                key={type}
                className={d.type === type ? "active" : ""}
                disabled={true}
              >
                {type === "invoice" ? (
                  <FileText size={13} />
                ) : (
                  <ClipboardList size={13} />
                )}{" "}
                {t[type]}
              </button>
            ))}
          </div>
          <section className="form-section">
            <h3>{t.customer}</h3>
            {data.customers.length > 0 && (
              <select
                style={{ fontSize: 11, marginBottom: 12 }}
                aria-label={t.chooseCustomer}
                defaultValue=""
                onChange={(e) => {
                  const c = data.customers.find((c) => c.id === e.target.value);
                  if (c)
                    patch({
                      customer: {
                        name: c.name,
                        address: c.address,
                        email: c.email,
                        phone: c.phone,
                      },
                    });
                }}
              >
                <option value="">{t.chooseCustomer}</option>
                {data.customers.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <Field label={t.customerName}>
              <input
                value={d.customer.name}
                onChange={(e) =>
                  patch({ customer: { ...d.customer, name: e.target.value } })
                }
                placeholder={t.customerName}
              />
            </Field>
            <div style={{ marginTop: 12 }}>
              <Field label={t.address}>
                <textarea
                  style={{ minHeight: 55 }}
                  value={d.customer.address}
                  onChange={(e) =>
                    patch({
                      customer: { ...d.customer, address: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <div className="grid2">
              <Field label={t.email}>
                <input
                  type="email"
                  value={d.customer.email}
                  onChange={(e) =>
                    patch({
                      customer: { ...d.customer, email: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label={t.phone}>
                <input
                  value={d.customer.phone}
                  onChange={(e) =>
                    patch({
                      customer: { ...d.customer, phone: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
          </section>
          <section className="form-section">
            <h3>{t.details}</h3>
            <div className="grid3">
              <Field label={t.number}>
                <input
                  value={d.number}
                  maxLength={80}
                  onChange={(e) => patch({ number: e.target.value })}
                />
              </Field>
              <Field label={t.issueDate}>
                <input
                  type="date"
                  value={d.issueDate}
                  onChange={(e) => patch({ issueDate: e.target.value })}
                />
              </Field>
              <Field label={d.type === "invoice" ? t.dueDate : t.validUntil}>
                <input
                  type="date"
                  min={d.issueDate}
                  value={d.dueDate}
                  onChange={(e) => patch({ dueDate: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid2">
              <CurrencySelect
                t={t}
                value={d.currency}
                onChange={(currency) => patch({ currency })}
              />
              <LanguageSelect
                label={t.documentLanguage}
                value={d.language}
                onChange={(language) => patch({ language })}
              />
            </div>
          </section>
          <section className="form-section">
            <h3>{t.items}</h3>
            <div className="item-labels">
              <span>{t.description}</span>
              <span>{t.qty}</span>
              <span>{t.rate}</span>
              <span style={{ textAlign: "right" }}>{t.amount}</span>
              <span />
            </div>
            {d.items.map((item, i) => (
              <div className="item-row" key={item.id}>
                <label className="item-cell item-description">
                  <span className="item-control-label">{t.description}</span>
                  <textarea
                    aria-label={`${t.description} ${i + 1}`}
                    value={item.description}
                    maxLength={2000}
                    onChange={(e) =>
                      itemPatch(item.id, { description: e.target.value })
                    }
                  />
                </label>
                <label className="item-cell">
                  <span className="item-control-label">{t.qty}</span>
                  <input
                    aria-label={`${t.qty} ${i + 1}`}
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) =>
                      itemPatch(item.id, { quantity: e.target.value })
                    }
                  />
                </label>
                <label className="item-cell">
                  <span className="item-control-label">{t.rate}</span>
                  <input
                    aria-label={`${t.rate} ${i + 1}`}
                    inputMode="decimal"
                    value={item.rate}
                    onChange={(e) =>
                      itemPatch(item.id, { rate: e.target.value })
                    }
                  />
                </label>
                <div className="item-amount">
                  <span className="item-control-label">{t.amount}</span>
                  {formatMoney(
                    totals.lines[i],
                    d.currency,
                    data.business.language,
                  )
                    .replace(d.currency, "")
                    .trim()}
                </div>
                <button
                  className="btn icon"
                  disabled={d.items.length === 1}
                  aria-label={`${t.remove} ${i + 1}`}
                  onClick={() =>
                    patch({ items: d.items.filter((x) => x.id !== item.id) })
                  }
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              className="btn text add-item"
              disabled={d.items.length >= 500}
              onClick={() =>
                patch({
                  items: [
                    ...d.items,
                    { id: uid(), description: "", quantity: "1", rate: "0" },
                  ],
                })
              }
            >
              <PlusCircle size={13} />
              {t.addItem}
            </button>
            <details className="optional">
              <summary>
                <ChevronDown
                  size={12}
                  style={{ verticalAlign: "middle", marginRight: 6 }}
                />
                {t.optional}
              </summary>
              <div className="grid2">
                <Field label={t.discount}>
                  <select
                    value={d.discountKind}
                    aria-label={t.discount}
                    onChange={(e) =>
                      patch({
                        discountKind: e.target.value as "fixed" | "percent",
                      })
                    }
                  >
                    <option value="fixed">{t.fixed}</option>
                    <option value="percent">{t.percent}</option>
                  </select>
                </Field>
                <Field label={t.amount}>
                  <input
                    inputMode="decimal"
                    value={d.discount}
                    onChange={(e) => patch({ discount: e.target.value })}
                  />
                </Field>
                <Field label={t.tax}>
                  <select
                    value={d.taxKind ?? "percent"}
                    aria-label={t.tax}
                    onChange={(e) =>
                      patch({ taxKind: e.target.value as "fixed" | "percent" })
                    }
                  >
                    <option value="percent">{t.percent}</option>
                    <option value="fixed">{t.fixed}</option>
                  </select>
                </Field>
                <Field label={`${t.tax} — ${t.amount}`}>
                  <input
                    inputMode="decimal"
                    value={d.tax}
                    onChange={(e) => patch({ tax: e.target.value })}
                  />
                </Field>
              </div>
            </details>
          </section>
          <section className="form-section stack">
            <Field label={t.notes}>
              <textarea
                value={d.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </Field>
            <Field label={t.paymentDetails}>
              <textarea
                value={d.paymentDetails}
                onChange={(e) => patch({ paymentDetails: e.target.value })}
              />
            </Field>
            <button
              className="btn text"
              onClick={() =>
                patch({ business: structuredClone(data.business) })
              }
              style={{ fontSize: 10 }}
            >
              {t.refreshBrand}
            </button>
          </section>
        </fieldset>
        <section className="preview-area">
          <div className="preview-head">
            <span>{t.preview}</span>
            <span className="pill">A4 · {d.currency}</span>
          </div>
          <DocumentPreview document={d} />
          <p className="preview-disclaimer">{t.draftHint}</p>
        </section>
      </div>
    </>
  );
}