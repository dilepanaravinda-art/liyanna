import type { User } from "@supabase/supabase-js";
import { LegacyRecords } from "./legacy-records";
import { useState } from "react";
import {
  HardDrive,
  Download,
  Upload,
  Cloud,
  Users,
  ShieldCheck,
} from "lucide-react";
import type { WorkspaceSnapshot } from "../domain/model";
import type { Copy } from "../i18n";
import { parseBackup } from "../storage/backup";
import { ErrorBox } from "./components";
import dynamic from "next/dynamic";
import { cloudConfigured } from "../cloud/client";
import type { SyncController } from "../cloud/use-sync";
const CloudPanel = dynamic(() => import("./cloud-panel"));
export function BackupTeam({
  user,
  data,
  t,
  onRestore,
  onExport,
  sync,
}: {
  user: User;
  data: WorkspaceSnapshot;
  t: Copy;
  onRestore: (s: WorkspaceSnapshot) => Promise<void>;
  onExport: () => void;
  sync: SyncController;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <div className="heading">
        <div>
          <h1>{t.backupTitle}</h1>
          <p>{t.backupHint}</p>
        </div>
        <span className="pill">
          <ShieldCheck size={12} />
          {t.onDevice}
        </span>
      </div>
      {error && <ErrorBox message={error} onClose={() => setError("")} />}
      <div className="backup-grid">
        <section className="panel">
          <HardDrive size={24} />
          <h3>{t.deviceBackup}</h3>
          <p>{t.deviceBackupHint}</p>
          <div className="row wrap">
            <button className="btn primary" onClick={onExport}>
              <Download size={14} />
              {t.exportBackup}
            </button>
            <label className="btn">
              <Upload size={14} />
              {t.restore}
              <input
                hidden
                aria-label={t.selectFile}
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    if (file.size > 50_000_000)
                      throw Error("Backup exceeds 50 MB");
                    const snapshot = parseBackup(await file.text());
                    if (window.confirm(t.restoreWarning))
                      await onRestore(snapshot);
                  } catch (err) {
                    setError((err as Error).message);
                  }
                }}
              />
            </label>
          </div>
          <div className="notice warning" style={{ marginTop: 20 }}>
            {t.backupReminder}
          </div>
        </section>
        {cloudConfigured ? (
          <CloudPanel
            user={user}
            data={data}
            t={t}
            sync={sync}
            onRestore={onRestore}
          />
        ) : (
          <>
            <section className="panel">
              <Cloud size={24} />
              <h3>{t.cloudBackup}</h3>
              <p>{t.cloudBackupHint}</p>
              <div className="cloud-status">
                <Cloud size={16} />
                {t.notConnected}
              </div>
            </section>
            <section className="panel full">
              <Users size={24} />
              <h3>{t.team}</h3>
              <p>{t.teamHint}</p>
              <div className="notice">{t.cloudUnavailable}</div>
            </section>
          </>
        )}
      </div>
      <LegacyRecords language={data.business.language} onImport={onRestore} />
    </>
  );
}
