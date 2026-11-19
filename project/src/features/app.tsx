"use client";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import {
  FileText,
  LayoutDashboard,
  Users,
  Settings,
  PlugZap,
  Cloud,
  HardDrive,
  Download,
  ShieldCheck,
  Menu,
  ChevronRight,
  Store,
  Check,
  Globe,
  X,
} from "lucide-react";
import {
  emptyWorkspace,
  blankDocument,
  allocateLocalNumber,
  uid,
  type Business,
  type Document,
  type DocumentType,
  type WorkspaceSnapshot,
  type Customer,
  type Language,
} from "../domain/model";
import { copy, languages } from "../i18n";
import { createAccountRepository } from "../storage/account";
import type { User } from "@supabase/supabase-js";
import { WorkspaceStart } from "./workspace-start";
import { exportBackup, downloadFile } from "../storage/backup";
import { BusinessForm } from "./business-form";
import { DocumentList } from "./documents/list";
import { CommercialDashboard } from "./commercial-dashboard";
import { IntegrationCenter } from "./integration-center";
import { Editor } from "./documents/editor";
import { Customers } from "./customers";
import { BackupTeam } from "./backup-team";
import { ErrorBox } from "./components";
import { getAccountFlag } from "../storage/account";
import { getCloudWorkspace } from "../cloud/sync";
import type { SyncSettings } from "../cloud/use-sync";
import { useCloudSync } from "../cloud/use-sync";
import { GettingStarted } from "./getting-started";
import { prepareDocumentSave } from "../domain/document-save";
export default function Liyanna({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => Promise<void>;
}) {
  const repository = useMemo(() => createAccountRepository(user.id), [user.id]);
  const [data, setData] = useState<WorkspaceSnapshot | null>(null),
    [loaded, setLoaded] = useState(false),
    [fatal, setFatal] = useState(""),
    [screen, setScreen] = useState("documents"),
    [editing, setEditing] = useState<Document | null>(null),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [setup] = useState(emptyWorkspace);
  const t = copy(data?.business.language ?? "en");
  useEffect(() => {
    repository
      .load()
      .then(async (snapshot) => {
        if (snapshot) {
          const settings = await getAccountFlag<SyncSettings>(
            user.id,
            `sync:${snapshot.business.id}`,
          );
          if (settings?.enabled) {
            const remote = await getCloudWorkspace(snapshot.business.id);
            if (
              remote.role !== settings.role ||
              remote.scope !== settings.scope
            ) {
              await repository.save(remote.snapshot, snapshot.updatedAt);
              const { snapshot: remoteSnapshot, ...metadata } = remote;
              const { setAccountFlag } = await import("../storage/account");
              await setAccountFlag(user.id, `sync:${snapshot.business.id}`, {
                ...settings,
                ...metadata,
                lastSyncedAt: remoteSnapshot.updatedAt,
              });
              snapshot = remoteSnapshot;
            }
          }
        }
        setData(snapshot);
      })
      .catch((e) => setFatal(e.message))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.lang = data?.business.language ?? "en";
  }, [data?.business.language]);
  const persist = useCallback(async (next: WorkspaceSnapshot) => {
    const expected = dataRef.current?.updatedAt ?? null;
    const snapshot = {
      ...next,
      updatedAt: new Date(
        Math.max(Date.now(), expected ? Date.parse(expected) + 1 : 0),
      ).toISOString(),
    };
    await repository.save(snapshot, expected);
    dataRef.current = snapshot;
    setData(snapshot);
    return snapshot;
  }, []);
  const acceptCloud = useCallback(async (snapshot: WorkspaceSnapshot) => {
    dataRef.current = snapshot;
    setData(snapshot);
  }, []);
  const persistCloud = useCallback(async (snapshot: WorkspaceSnapshot) => {
    await repository.save(snapshot, dataRef.current?.updatedAt ?? null);
  }, []);
  const sync = useCloudSync(data, dirty, acceptCloud, user.id, persistCloud);
  const dirtyChange = useCallback((value: boolean) => setDirty(value), []);
  const leave = () =>
    !dirty || window.confirm(t.unsaved + " — " + t.back + "?");
  function navigate(next: string) {
    if (!leave()) return;
    setDirty(false);
    setEditing(null);
    setScreen(next);
    setMenu(false);
    setError("");
  }
  function create(type: DocumentType) {
    if (!data || !leave()) return;
    const { number } = allocateLocalNumber(type, data.sequences[type]);
    const d = blankDocument(data.business, type, number);
    d.notes = type === "invoice" ? t.invoiceNotes : t.quoteNotes;
    setEditing(d);
    setScreen("editor");
    setDirty(true);
  }
  async function saveDocument(d: Document): Promise<Document> {
    const workspace = dataRef.current;
    if (!workspace) throw Error("Workspace unavailable");
    const existing = workspace.documents.find((x) => x.id === d.id);
    const saved = prepareDocumentSave(d, workspace);
    const next = {
      ...workspace,
      documents: [...workspace.documents.filter((x) => x.id !== d.id), saved],
      sequences: {
        ...workspace.sequences,
        [d.type]: workspace.sequences[d.type] + (existing ? 0 : 1),
      },
    };
    await persist(next);
    setToast(t.documentSaved);
    return saved;
  }
  async function remove(kind: "documents" | "customers", id: string) {
    if (!data || !window.confirm(t.confirmDelete)) return;
    try {
      await persist({ ...data, [kind]: data[kind].filter((v) => v.id !== id) });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function duplicate(d: Document) {
    if (!data) return;
    const { number } = allocateLocalNumber(d.type, data.sequences[d.type]);
    const now = new Date().toISOString();
    try {
      await saveDocument({
        ...structuredClone(d),
        id: uid(),
        number,
        revision: 0,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const backup = () => {
    if (data)
      downloadFile(
        exportBackup(data),
        `liyanna-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
  };
  async function requestSignOut() {
    if (!leave()) return;
    try {
      sync.suspend();
      await onSignOut();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!loaded || (data && !sync.ready))
    return (
      <div className="loading">
        <img src="/brand/liyanna.png" className="brand" alt="Liyanna" />
        Opening your workspace…
      </div>
    );
  if (fatal || sync.status === "blocked")
    return (
      <main style={{ maxWidth: 600, margin: "15vh auto", padding: 25 }}>
        <img src="/brand/liyanna.png" className="brand" alt="Liyanna" />
        <ErrorBox message={fatal || sync.error} />
        <p>
          Your existing browser records have not been replaced. Browser storage
          must be available to open this workspace.
        </p>
        <button className="btn" onClick={() => location.reload()}>
          Retry
        </button>
        <button className="btn" onClick={() => void requestSignOut()}>
          {t.signOut}
        </button>
      </main>
    );
  if (!data)
    return (
      <WorkspaceStart
        userId={user.id}
        onDirty={dirtyChange}
        onSignOut={requestSignOut}
        onOpen={async (snapshot, shared) => {
          if (shared) await sync.adopt(shared);
          else await persist(snapshot);
          setDirty(false);
        }}
      />
    );
  const nav = [
    { key: "dashboard", label: "Overview", icon: LayoutDashboard },
    { key: "documents", label: t.documents, icon: FileText },
    { key: "customers", label: t.customers, icon: Users },
    ...(sync.settings?.role === "staff"
      ? []
      : [{ key: "settings", label: t.settings, icon: Settings }]),
    ...(sync.settings?.role === "staff" ? [] : [{ key: "integrations", label: "Integrations", icon: PlugZap }]),
    { key: "backup", label: t.backupTeam, icon: Cloud },
  ];
  return (
    <div className="shell">
      {menu && (
        <button
          style={{
            position: "fixed",
            inset: 0,
            background: "#102e2355",
            zIndex: 19,
          }}
          aria-label={t.cancel}
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <button
          style={{ background: "transparent", padding: 0, textAlign: "left" }}
          onClick={() => navigate("documents")}
          aria-label="Liyanna"
        >
          <img src="/brand/liyanna.png" alt="Liyanna" className="brand" />
        </button>
        <div className="business-switch row">
          <Store size={15} color="#176b65" />
          <span>{data.business.name}</span>
          <ChevronRight
            size={12}
            style={{ marginLeft: "auto", color: "#97a5ab" }}
          />
        </div>
        <nav className="nav" aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.key}
              className={
                screen === n.key ||
                (screen === "editor" && n.key === "documents")
                  ? "active"
                  : ""
              }
              onClick={() => navigate(n.key)}
            >
              <n.icon size={17} strokeWidth={1.7} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="storage-card">
            <div className="row" style={{ gap: 9 }}>
              <HardDrive size={17} />
              <b>{t.localStorage}</b>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 5,
                  background: "#36a177",
                  marginLeft: "auto",
                }}
              />
            </div>
            <p>{dirty ? t.unsaved : t.saved}</p>
            <button
              className="btn text"
              onClick={backup}
              style={{ fontSize: 10, gap: 9 }}
            >
              <Download size={13} />
              {t.exportBackup}
            </button>
          </div>
          <button className="btn" onClick={() => void requestSignOut()}>
            {t.signOut}
          </button>
          <p className="side-foot">Liyanna · {t.privacy}</p>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="row">
            <button
              className="menu-mobile"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="breadcrumb">
              <span>Liyanna</span>
              <ChevronRight size={11} />
              <b>
                {screen === "editor"
                  ? t[editing?.type ?? "invoice"]
                  : nav.find((n) => n.key === screen)?.label}
              </b>
            </div>
          </div>
          <div className="top-controls">
            <div className="row" style={{ gap: 3 }}>
              <Globe size={13} color="#82959a" />
              <select
                aria-label={t.appLanguage}
                value={data.business.language}
                onChange={async (e) => {
                  try {
                    await persist({
                      ...data,
                      business: {
                        ...data.business,
                        language: e.target.value as Language,
                        documentLanguage: e.target.value as Language,
                      },
                    });
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }}
              >
                {languages.map((l) => (
                  <option value={l.value} key={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="avatar" title={data.business.name}>
              {data.business.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          </div>
        </header>
        {error && <ErrorBox message={error} onClose={() => setError("")} />}{" "}
        {sync.error && (
          <ErrorBox message={sync.error} onClose={sync.clearError} />
        )}{" "}
        {sync.settings?.enabled && (
          <div className="notice" style={{ marginBottom: 20 }}>
            <Cloud size={13} />
            {sync.conflict
              ? t.conflict
              : sync.status === "synced"
                ? t.synced
                : t.pendingSync}
            <button
              className="btn text"
              onClick={() => navigate("backup")}
              style={{ marginLeft: 16, fontSize: 11 }}
            >
              {t.backupTeam}
            </button>
          </div>
        )}{" "}
        {screen === "dashboard" && <><GettingStarted data={data} onNavigate={navigate} /><CommercialDashboard data={data} /></>}
        {screen === "integrations" && sync.settings?.role !== "staff" && <IntegrationCenter isOwner={true} data={data} />}
        {screen === "documents" && (
          <DocumentList
            data={data}
            t={t}
            onCreate={create}
            onOpen={(d) => {
              setEditing(structuredClone(d));
              setScreen("editor");
              setDirty(false);
            }}
            onDuplicate={duplicate}
            onDelete={(id) => remove("documents", id)}
          />
        )}{" "}
        {screen === "editor" && editing && (
          <Editor
            key={editing.id}
            initial={editing}
            data={data}
            t={t}
            onSave={saveDocument}
            onPrepareDownload={async (d) => {
              if (!sync.settings?.enabled) return d;
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve()),
              );
              const snapshot = dataRef.current;
              if (!snapshot) throw Error("Workspace unavailable");
              return sync.prepareDownload(snapshot, d.id);
            }}
            onBack={() => navigate("documents")}
            onDirty={dirtyChange}
          />
        )}{" "}
        {screen === "customers" && (
          <Customers
            data={data}
            t={t}
            onSave={async (c: Customer) => {
              await persist({
                ...data,
                customers: [...data.customers.filter((x) => x.id !== c.id), c],
              });
              setToast(t.customerSaved);
            }}
            onDelete={(id) => {
              if (sync.settings?.role === "staff") {
                setError(t.ownerOnly);
                return;
              }
              void remove("customers", id);
            }}
          />
        )}{" "}
        {screen === "settings" && (
          <>
            <div className="heading">
              <div>
                <h1>{t.settings}</h1>
                <p>{t.refreshHint}</p>
              </div>
            </div>
            <BusinessForm
              key={data.business.id}
              business={data.business}
              onDirty={dirtyChange}
              onSave={async (business: Business) => {
                await persist({ ...data, business });
                setToast(t.settingsSaved);
              }}
            />
          </>
        )}{" "}
        {screen === "backup" && (
          <BackupTeam
            user={user}
            data={data}
            t={t}
            sync={sync}
            onRestore={async (snapshot) => {
              await sync.stop();
              await persist(snapshot);
              setDirty(false);
              setEditing(null);
              setToast(t.backupRestored);
            }}
            onExport={backup}
          />
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check
            size={13}
            style={{ verticalAlign: "middle", marginRight: 8 }}
          />
          {toast}
        </div>
      )}
    </div>
  );
}
