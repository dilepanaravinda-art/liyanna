import { useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Copy,
  Trash2,
  ArrowUpRight,
  Files,
} from "lucide-react";
import type {
  Document,
  DocumentType,
  WorkspaceSnapshot,
} from "../../domain/model";
import { calculate, formatMoney } from "../../domain/money";
import { documentSchema } from "../../domain/validation";
import type { Copy as CopyText } from "../../i18n";
import { formatDate } from "../components";
export function DocumentList({
  data,
  t,
  onCreate,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  data: WorkspaceSnapshot;
  t: CopyText;
  onCreate: (type: DocumentType) => void;
  onOpen: (d: Document) => void;
  onDuplicate: (d: Document) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const docs = data.documents
    .filter(
      (d) =>
        (filter === "all" || d.type === filter) &&
        `${d.number} ${d.customer.name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <>
      <div className="heading">
        <div>
          <h1>{t.documents}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => onCreate("quote")}>
            <Plus size={15} />
            {t.createQuote}
          </button>
          <button className="btn primary" onClick={() => onCreate("invoice")}>
            <Plus size={15} />
            {t.createInvoice}
          </button>
        </div>
      </div>
      {data.documents.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Files size={33} strokeWidth={1.3} />
          </div>
          <h2>{t.emptyDocuments}</h2>
          <p>{t.emptyHint}</p>
          <div className="row">
            <button className="btn primary" onClick={() => onCreate("invoice")}>
              <Plus size={15} />
              {t.createInvoice}
            </button>
            <button className="btn" onClick={() => onCreate("quote")}>
              {t.createQuote}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="tabs">
              {[
                ["all", t.all],
                ["invoice", t.invoices],
                ["quote", t.quotes],
              ].map(([key, label]) => (
                <button
                  className={filter === key ? "active" : ""}
                  onClick={() => setFilter(key)}
                  key={key}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="search">
              <Search size={15} />
              <input
                aria-label={t.search}
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="panel table-panel table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.number}</th>
                  <th>{t.customer}</th>
                  <th>{t.date}</th>
                  <th>{t.total}</th>
                  <th>{t.draft}</th>
                  <th className="right">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <button className="doc-link" onClick={() => onOpen(d)}>
                        {d.number}
                      </button>
                      <div
                        style={{ fontSize: 9, marginTop: 4, color: "#91a1a9" }}
                      >
                        {t[d.type]}
                      </div>
                    </td>
                    <td>{d.customer.name || "—"}</td>
                    <td>{formatDate(d.issueDate, data.business.language)}</td>
                    <td style={{ fontWeight: 700 }}>
                      {formatMoney(
                        calculate(d).total,
                        d.currency,
                        data.business.language,
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          "pill " +
                          (!documentSchema.safeParse(d).success ? "grey" : "")
                        }
                      >
                        {documentSchema.safeParse(d).success
                          ? t.ready
                          : t.draft}
                      </span>
                    </td>
                    <td>
                      <div
                        className="row"
                        style={{ justifyContent: "flex-end", gap: 4 }}
                      >
                        <button
                          className="btn icon"
                          aria-label={`${t.duplicate} ${d.number}`}
                          onClick={() => onDuplicate(d)}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn icon"
                          aria-label={`${t.delete} ${d.number}`}
                          onClick={() => onDelete(d.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!docs.length && (
              <p style={{ padding: 30, textAlign: "center", fontSize: 12 }}>
                {t.noResults}
              </p>
            )}
          </div>
          <div className="stat-line">
            {docs.length} {t.documents.toLowerCase()} · {t.onDevice}
          </div>
        </>
      )}
    </>
  );
}