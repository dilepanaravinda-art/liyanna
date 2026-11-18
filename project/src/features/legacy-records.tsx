"use client";
import { useEffect, useState } from "react";
import type { Language, WorkspaceSnapshot } from "../domain/model";
import { createLocalRepository } from "../storage/local";
import { downloadFile, exportBackup } from "../storage/backup";
import { accessCopy } from "./access-copy";
import { ErrorBox } from "./components";
export function LegacyRecords({
  language,
  onImport,
}: {
  language: Language;
  onImport: (snapshot: WorkspaceSnapshot) => Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const t = accessCopy(language);
  useEffect(() => {
    let alive = true;
    createLocalRepository()
      .load()
      .then((v) => {
        if (alive) setSnapshot(v);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  if (!snapshot && !error) return null;
  return (
    <section className="panel stack">
      <h3>{t.legacy}</h3>
      <p>{t.legacyHint}</p>
      {error && <ErrorBox message={error} />}
      {snapshot && (
        <div className="row wrap">
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              downloadFile(
                exportBackup(snapshot),
                "liyanna-existing-records.json",
                "application/json",
              )
            }
          >
            {t.exportLegacy}
          </button>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(t.confirmLegacy)) return;
              setBusy(true);
              setError("");
              try {
                await onImport(snapshot);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t.importLegacy}
          </button>
        </div>
      )}
    </section>
  );
}
