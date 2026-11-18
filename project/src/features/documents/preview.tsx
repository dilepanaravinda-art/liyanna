import type { Document } from "../../domain/model";
import { calculate, formatMoney } from "../../domain/money";
import { copy } from "../../i18n";
import { formatDate } from "../components";
export function DocumentPreview({ document: d }: { document: Document }) {
  const t = copy(d.language);
  let totals;
  try {
    totals = calculate(d);
  } catch {
    totals = {
      lines: d.items.map(() => "0"),
      subtotal: "0",
      discount: "0",
      tax: "0",
      total: "0",
    };
  }
  const money = (v: string) => formatMoney(v, d.currency, d.language);
  return (
    <article className="paper" lang={d.language}>
      <div className="paper-brand">
        <div>
          {d.business.logo && (
            <img
              className="paper-logo"
              src={d.business.logo}
              alt={d.business.name}
            />
          )}
          <h2 style={{ marginTop: d.business.logo ? 9 : 0 }}>
            {d.business.name}
          </h2>
        </div>
        <div className="paper-contact">
          {d.business.address}
          {d.business.email && "\n" + d.business.email}
          {d.business.phone && "\n" + d.business.phone}
        </div>
      </div>
      <div className="paper-meta">
        <h2 className="paper-title">{t[d.type]}</h2>
        <div className="paper-dates">
          <span>{t.number}</span>
          <span>{d.number}</span>
          <span>{t.issueDate}</span>
          <span>{formatDate(d.issueDate, d.language)}</span>
          {d.dueDate && (
            <>
              <span>{d.type === "invoice" ? t.dueDate : t.validUntil}</span>
              <span>{formatDate(d.dueDate, d.language)}</span>
            </>
          )}
        </div>
      </div>
      <div className="paper-customer">
        <div className="muted">
          {d.type === "invoice" ? t.billTo : t.quoteFor}
        </div>
        <b>{d.customer.name || "—"}</b>
        <div>
          {[d.customer.address, d.customer.email, d.customer.phone]
            .filter(Boolean)
            .join("\n")}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t.description}</th>
            <th>{t.qty}</th>
            <th>
              {t.rate} ({d.currency})
            </th>
            <th>
              {t.amount} ({d.currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((item, i) => (
            <tr key={item.id}>
              <td>{item.description || "—"}</td>
              <td>{item.quantity || "—"}</td>
              <td>
                {money(item.rate || "0")
                  .replace(d.currency, "")
                  .trim()}
              </td>
              <td>{money(totals.lines[i]).replace(d.currency, "").trim()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="paper-totals">
        <div>
          <span>{t.subtotal}</span>
          <span>{money(totals.subtotal)}</span>
        </div>
        {Number(totals.discount) > 0 && (
          <div>
            <span>
              {t.discount} (
              {d.discountKind === "percent" ? `${d.discount}%` : d.currency})
            </span>
            <span>− {money(totals.discount)}</span>
          </div>
        )}
        {Number(totals.tax) > 0 && (
          <div>
            <span>
              {t.tax} ({d.tax}
              {d.taxKind === "fixed" ? ` ${d.currency}` : "%"})
            </span>
            <span>{money(totals.tax)}</span>
          </div>
        )}
        <div className="grand-total">
          <span>{t.total}</span>
          <span>{money(totals.total)}</span>
        </div>
      </div>
      {d.notes && (
        <div className="paper-notes">
          <b>{t.notes}</b>
          {d.notes}
        </div>
      )}
      {d.paymentDetails && (
        <div className="paper-notes">
          <b>{t.paymentDetails}</b>
          {d.paymentDetails}
        </div>
      )}
      <div className="paper-footer">
        {d.number} · {d.currency}
      </div>
    </article>
  );
}