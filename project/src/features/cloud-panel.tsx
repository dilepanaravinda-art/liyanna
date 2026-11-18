"use client";
import { useEffect, useState } from "react";
import {
  Cloud,
  Users,
  LogOut,
  RefreshCw,
  Trash2,
  Download,
  ShieldCheck,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { WorkspaceSnapshot } from "../domain/model";
import type { Copy } from "../i18n";
import { cloudClient } from "../cloud/client";
import { downloadFile, exportBackup } from "../storage/backup";
import {
  createCloudBackup,
  deleteCloudBackup,
  listCloudBackups,
  restoreCloudBackup,
  ensureBusiness,
  type BackupMetadata,
} from "../cloud/backup";
import {
  getCloudWorkspace,
  listMemberships,
  listStaff,
  setStaff,
  removeStaff,
  syncWorkspace,
  deleteSharedWorkspace,
  type Member,
} from "../cloud/sync";
import type { SyncController } from "../cloud/use-sync";
import { Field, ErrorBox } from "./components";
export default function CloudPanel({
  user,
  data,
  t,
  sync,
  onRestore,
}: {
  user: User;
  data: WorkspaceSnapshot;
  t: Copy;
  sync: SyncController;
  onRestore: (s: WorkspaceSnapshot) => Promise<void>;
}) {
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false),
    [teamConsent, setTeamConsent] = useState(false),
    [backups, setBackups] = useState<BackupMetadata[]>([]),
    [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]),
    [members, setMembers] = useState<Member[]>([]),
    [staffEmail, setStaffEmail] = useState(""),
    [scope, setScope] = useState<"own" | "all">("own");
  const owner = sync.settings?.role !== "staff";
  async function refresh() {
    setBackups(await listCloudBackups(data.business.id));
    setMembers(await listStaff(data.business.id));
    setBusinesses(await listMemberships());
  }
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    listMemberships()
      .then((v) => {
        if (alive) setBusinesses(v);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [user.id]);
  return (
    <>
      <section className="panel full">
        <div className="row spread">
          <div className="row">
            <Cloud size={22} color="#006b6e" />
            <h3 style={{ margin: 0 }}>{t.cloudAccount}</h3>
          </div>
          <span className="pill">{t.cloudReady}</span>
        </div>
        {error && (
          <div style={{ marginTop: 18 }}>
            <ErrorBox message={error} onClose={() => setError("")} />
          </div>
        )}
        {message && (
          <div className="notice" role="status" style={{ marginTop: 18 }}>
            {message}
          </div>
        )}
        <>
          <div className="row spread wrap" style={{ marginTop: 20 }}>
            <span style={{ fontSize: 12 }}>{user.email}</span>
          </div>
          <details style={{ marginTop: 16, fontSize: 11 }}>
            <summary>{t.updatePassword}</summary>
            <div className="row" style={{ marginTop: 12 }}>
              <input
                type="password"
                aria-label={t.password}
                placeholder={t.password}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="btn"
                disabled={busy || password.length < 8}
                onClick={() =>
                  void run(async () => {
                    const r = await cloudClient().auth.updateUser({
                      password,
                    });
                    if (r.error) throw r.error;
                    setPassword("");
                    setMessage(t.updatePassword);
                  })
                }
              >
                {t.save}
              </button>
            </div>
          </details>
          {businesses.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <Field label={t.switchWorkspace}>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const id = e.target.value;
                    e.target.value = "";
                    if (!id) return;
                    void run(async () => {
                      const remote = await getCloudWorkspace(id);
                      if (window.confirm(t.restoreWarning))
                        await sync.adopt(remote);
                    });
                  }}
                >
                  <option value="">{t.switchWorkspace}</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </>
      </section>
      {user && (
        <>
          <section className="panel">
            <Cloud size={23} />
            <h3>{t.cloudBackup}</h3>
            <p>{t.cloudBackupHint}</p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t.cloudConsent}
            </label>
            <div className="row wrap">
              <button
                className="btn primary"
                disabled={busy || !consent || !owner}
                onClick={() =>
                  void run(async () => {
                    await createCloudBackup(data);
                    setConsent(false);
                    await refresh();
                  })
                }
              >
                <UploadIcon />
                {t.enableCloud}
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() => void run(refresh)}
              >
                <RefreshCw size={13} />
                {t.loadBackups}
              </button>
            </div>
            {!owner && <p>{t.ownerOnly}</p>}
            <div className="backup-list">
              {backups.map((b) => (
                <div className="backup-record" key={b.id}>
                  <span>{new Date(b.created_at).toLocaleString()}</span>
                  <div className="row">
                    <button
                      className="btn icon"
                      disabled={busy}
                      aria-label={t.restoreCloud}
                      onClick={() =>
                        void run(async () => {
                          const snapshot = await restoreCloudBackup(b.id);
                          if (window.confirm(t.restoreWarning))
                            await onRestore(snapshot);
                        })
                      }
                    >
                      <Download size={13} />
                    </button>
                    <button
                      className="btn icon danger"
                      aria-label={t.deleteCloud}
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t.cloudDeleteWarning))
                          void run(async () => {
                            await deleteCloudBackup(b.id);
                            await refresh();
                          });
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <Users size={23} />
            <h3>{t.team}</h3>
            <p>{t.teamHint}</p>
            {!sync.settings?.enabled ? (
              <>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={teamConsent}
                    onChange={(e) => setTeamConsent(e.target.checked)}
                  />
                  {t.teamConsent}
                </label>
                <button
                  className="btn primary"
                  disabled={busy || !teamConsent || !owner}
                  onClick={() =>
                    void run(async () => {
                      await ensureBusiness(data);
                      const remote = await getCloudWorkspace(data.business.id);
                      if (
                        remote.revision > 0 &&
                        (remote.snapshot.documents.length ||
                          remote.snapshot.customers.length)
                      )
                        throw Error(t.cloudImportWarning);
                      await sync.adopt(
                        await syncWorkspace(data, remote.revision),
                      );
                      await refresh();
                      setTeamConsent(false);
                    })
                  }
                >
                  {t.enableSync}
                </button>
              </>
            ) : (
              <>
                <span className="pill">
                  {sync.status === "synced" ? t.synced : t.pendingSync} ·{" "}
                  {sync.settings.role === "owner" ? t.owner : t.team}
                </span>
                <div className="row wrap" style={{ marginTop: 16 }}>
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => void run(sync.run)}
                  >
                    <RefreshCw size={13} />
                    {t.syncNow}
                  </button>
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t.syncWarning)) void run(sync.stop);
                    }}
                  >
                    {t.stopSync}
                  </button>
                </div>
                {owner && (
                  <div style={{ marginTop: 22 }}>
                    <button
                      className="btn text danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t.cloudRecordsWarning))
                          void run(async () => {
                            await deleteSharedWorkspace(data.business.id);
                            await sync.stop();
                            await refresh();
                          });
                      }}
                    >
                      {t.cloudRecordsDelete}
                    </button>
                  </div>
                )}
              </>
            )}
            {sync.error && <ErrorBox message={sync.error} />}
          </section>
          {sync.conflict && (
            <section className="panel full">
              <h3>{t.conflict}</h3>
              <p>
                {sync.conflict.snapshot.documents.length} {t.documents} ·{" "}
                {new Date(sync.conflict.snapshot.updatedAt).toLocaleString()}
              </p>
              <div className="row wrap">
                <button
                  className="btn"
                  onClick={() =>
                    downloadFile(
                      exportBackup(sync.conflict!.snapshot),
                      "liyanna-cloud-review.json",
                    )
                  }
                >
                  {t.exportBackup} ({t.cloud})
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    downloadFile(
                      exportBackup(data),
                      "liyanna-local-review.json",
                    )
                  }
                >
                  {t.exportBackup} ({t.onDevice})
                </button>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t.restoreWarning))
                      void run(() => sync.adopt(sync.conflict!));
                  }}
                >
                  {t.useCloud}
                </button>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t.conflict + " " + t.keepLocal + "?"))
                      void run(sync.resolveLocal);
                  }}
                >
                  {t.keepLocal}
                </button>
              </div>
            </section>
          )}
          {sync.settings?.enabled && owner && (
            <section className="panel full">
              <div className="row spread">
                <h3>{t.invite}</h3>
                <button
                  className="btn text"
                  disabled={busy}
                  onClick={() => void run(refresh)}
                >
                  <RefreshCw size={13} />
                  {t.loadBackups}
                </button>
              </div>
              <p>{t.inviteHint}</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await setStaff(data.business.id, staffEmail, scope);
                    setStaffEmail("");
                    await refresh();
                  });
                }}
              >
                <div className="grid2">
                  <Field label={t.email}>
                    <input
                      type="email"
                      required
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                    />
                  </Field>
                  <Field label={t.staffScope}>
                    <select
                      value={scope}
                      onChange={(e) =>
                        setScope(e.target.value as "own" | "all")
                      }
                    >
                      <option value="own">{t.ownDocuments}</option>
                      <option value="all">{t.allBusinessDocuments}</option>
                    </select>
                  </Field>
                </div>
                <button
                  className="btn primary"
                  style={{ marginTop: 16 }}
                  disabled={busy}
                >
                  {t.addStaff}
                </button>
              </form>
              {members.length === 0 ? (
                <p style={{ marginTop: 20 }}>{t.noTeam}</p>
              ) : (
                members.map((m) => (
                  <div className="staff-row" key={m.user_id}>
                    <span>{m.email}</span>
                    <select
                      aria-label={`${t.staffScope} ${m.email}`}
                      value={m.scope}
                      disabled={busy}
                      onChange={(e) =>
                        void run(async () => {
                          await setStaff(
                            data.business.id,
                            m.email,
                            e.target.value as "own" | "all",
                          );
                          await refresh();
                        })
                      }
                    >
                      <option value="own">{t.ownDocuments}</option>
                      <option value="all">{t.allBusinessDocuments}</option>
                    </select>
                    <button
                      className="btn icon danger"
                      disabled={busy}
                      aria-label={`${t.removeStaff} ${m.email}`}
                      onClick={() => {
                        if (window.confirm(t.confirmDelete))
                          void run(async () => {
                            await removeStaff(data.business.id, m.user_id);
                            await refresh();
                          });
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
function UploadIcon() {
  return <Cloud size={13} />;
}
