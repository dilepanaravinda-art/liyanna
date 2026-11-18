"use client";
import { useEffect, useState } from "react";
import {
  emptyWorkspace,
  type Language,
  type WorkspaceSnapshot,
} from "../domain/model";
import {
  listMemberships,
  getCloudWorkspace,
  type CloudWorkspace,
} from "../cloud/sync";
import { BusinessForm } from "./business-form";
import { LegacyRecords } from "./legacy-records";
import { accessCopy } from "./access-copy";
import { languages } from "../i18n";
import { ErrorBox } from "./components";
export function WorkspaceStart({
  onOpen,
  onSignOut,
  onDirty,
}: {
  userId: string;
  onOpen: (
    snapshot: WorkspaceSnapshot,
    shared?: CloudWorkspace,
  ) => Promise<void>;
  onSignOut: () => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>(
      [],
    ),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [setup, setSetup] = useState(false),
    [busy, setBusy] = useState(false),
    [language, setLanguage] = useState<Language>("en");
  const [fresh] = useState(emptyWorkspace);
  const t = accessCopy(language);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    listMemberships()
      .then((v) => {
        if (alive) {
          setBusinesses(v);
          setSetup(v.length === 0);
        }
      })
      .catch(() => {
        if (alive) setError(accessCopy(language).membershipError);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      const remote = await getCloudWorkspace(id);
      await onOpen(remote.snapshot, remote);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="account-bar">
        <select
          aria-label={t.language}
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          {languages.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => void onSignOut()}>
          {t.signOut}
        </button>
      </div>
      {loading ? (
        <p className="loading">{t.checking}</p>
      ) : error ? (
        <main className="access-page">
          <ErrorBox message={error} />
          <button className="btn" onClick={() => setRetry((v) => v + 1)}>
            {t.retry}
          </button>
        </main>
      ) : (
        <>
          {businesses.length > 0 && (
            <section className="workspace-chooser panel stack">
              <h1>{t.choose}</h1>
              <p>{t.chooseHint}</p>
              {businesses.map((b) => (
                <button
                  className="btn"
                  disabled={busy}
                  key={b.id}
                  onClick={() => void open(b.id)}
                >
                  {t.open} {b.name}
                </button>
              ))}
              {!setup && (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => setSetup(true)}
                >
                  {t.newBusiness}
                </button>
              )}
            </section>
          )}
          {setup && (
            <BusinessForm
              business={{
                ...fresh.business,
                language,
                documentLanguage: language,
              }}
              setup
              onDirty={onDirty}
              onSave={(business) => onOpen({ ...fresh, business })}
            />
          )}
          <div className="legacy-start">
            <LegacyRecords
              language={language}
              onImport={(snapshot) => onOpen(snapshot)}
            />
          </div>
        </>
      )}
    </>
  );
}
