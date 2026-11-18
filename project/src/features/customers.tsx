import { useState } from "react";
import { Plus, Search, Users, Trash2, Pencil, X } from "lucide-react";
import { uid, type Customer, type WorkspaceSnapshot } from "../domain/model";
import { customerSchema } from "../domain/validation";
import type { Copy } from "../i18n";
import { Field, ErrorBox } from "./components";
export function Customers({
  data,
  t,
  onSave,
  onDelete,
}: {
  data: WorkspaceSnapshot;
  t: Copy;
  onSave: (c: Customer) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Customer | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const filtered = data.customers.filter((c) =>
    `${c.name} ${c.email} ${c.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const create = () => {
    setError("");
    setEditing({
      id: uid(),
      businessId: data.business.id,
      name: "",
      address: "",
      email: "",
      phone: "",
    });
  };
  return (
    <>
      <div className="heading">
        <div>
          <h1>{t.customers}</h1>
          <p>{t.emptyCustomersHint}</p>
        </div>
        <button className="btn primary" onClick={create}>
          <Plus size={15} />
          {t.addCustomer}
        </button>
      </div>
      {!data.customers.length ? (
        <div className="empty">
          <div className="empty-icon">
            <Users size={32} />
          </div>
          <h2>{t.emptyCustomers}</h2>
          <p>{t.emptyCustomersHint}</p>
          <button className="btn primary" onClick={create}>
            {t.addCustomer}
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <span className="muted" style={{ fontSize: 11 }}>
              {data.customers.length} {t.savedCustomers}
            </span>
            <div className="search">
              <Search size={15} />
              <input
                aria-label={t.searchCustomers}
                placeholder={t.searchCustomers}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="panel table-panel table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.customerName}</th>
                  <th>{t.email}</th>
                  <th>{t.phone}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <b>{c.name}</b>
                    </td>
                    <td>{c.email || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td>
                      <div className="row">
                        <button
                          className="btn icon"
                          onClick={() => {
                            setError("");
                            setEditing(c);
                          }}
                          aria-label={`${t.edit} ${c.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn icon"
                          onClick={() => onDelete(c.id)}
                          aria-label={`${t.delete} ${c.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {editing && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-title"
          >
            <div className="row spread">
              <h2 id="customer-title">{t.customer}</h2>
              <button
                className="btn icon"
                onClick={() => setEditing(null)}
                aria-label={t.cancel}
              >
                <X size={15} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const checked = customerSchema.safeParse(editing);
                if (!checked.success) {
                  setError(checked.error.issues[0].message);
                  return;
                }
                setBusy(true);
                try {
                  await onSave(checked.data);
                  setEditing(null);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {error && <ErrorBox message={error} />}
              <Field label={t.customerName}>
                <input
                  autoFocus
                  required
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </Field>
              <Field label={t.address}>
                <textarea
                  value={editing.address}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                />
              </Field>
              <div className="grid2">
                <Field label={t.email}>
                  <input
                    type="email"
                    value={editing.email}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                  />
                </Field>
                <Field label={t.phone}>
                  <input
                    value={editing.phone}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditing(null)}
                >
                  {t.cancel}
                </button>
                <button className="btn primary" disabled={busy}>
                  {t.save}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
