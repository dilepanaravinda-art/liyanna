"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceSnapshot } from "../domain/model";
import { getAccountFlag, setAccountFlag } from "../storage/account";
import { cloudConfigured } from "./client";
import { getCloudWorkspace, syncWorkspace, type CloudWorkspace } from "./sync";
import { synchronise, finaliseSharedDownload } from "./guarded-sync";
export interface SyncSettings {
  enabled: boolean;
  revision: number;
  lastSyncedAt: string;
  role: "owner" | "staff";
  scope: "owner" | "all" | "own";
}
export function useCloudSync(
  data: WorkspaceSnapshot | null,
  dirty: boolean,
  onIncoming: (s: WorkspaceSnapshot) => Promise<void>,
  userId: string,
) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<SyncSettings | null>(null),
    [status, setStatus] = useState("local"),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState<CloudWorkspace | null>(null);
  const latest = useRef({ data, dirty, settings, onIncoming, conflict });
  latest.current = { data, dirty, settings, onIncoming, conflict };
  const epoch = useRef(0),
    active = useRef<number | null>(null);
  const key = (id: string) => `sync:${id}`;
  useEffect(() => {
    const token = ++epoch.current;
    setReady(false);
    setSettings(null);
    setConflict(null);
    setError("");
    if (data && cloudConfigured)
      getAccountFlag<SyncSettings>(userId, key(data.business.id))
        .then((v) => {
          if (epoch.current === token) {
            setSettings(v ?? null);
            setReady(true);
          }
        })
        .catch((e) => {
          if (epoch.current === token) {
            setError(e.message);
            setStatus("blocked");
            setReady(true);
          }
        });
    if (!data || !cloudConfigured) setReady(true);
    return () => {
      epoch.current++;
    };
  }, [data?.business.id, userId]);
  const adopt = useCallback(
    async (value: CloudWorkspace, operation?: number) => {
      const token = operation ?? ++epoch.current;
      if (token !== epoch.current) return;
      const next: SyncSettings = {
        enabled: true,
        revision: value.revision,
        lastSyncedAt: value.snapshot.updatedAt,
        role: value.role,
        scope: value.scope,
      };
      await setAccountFlag(userId, key(value.snapshot.business.id), next);
      if (token !== epoch.current) {
        if (!latest.current.settings)
          await setAccountFlag(userId, key(value.snapshot.business.id), null);
        return;
      }
      await latest.current.onIncoming(value.snapshot);
      if (token !== epoch.current) return;
      latest.current.settings = next;
      setSettings(next);
      setConflict(null);
      setError("");
      setStatus("synced");
    },
    [],
  );
  const suspend = useCallback(() => {
    epoch.current++;
    active.current = null;
  }, []);
  const stop = useCallback(async () => {
    epoch.current++;
    active.current = null;
    const current = latest.current;
    latest.current.settings = null;
    setSettings(null);
    setConflict(null);
    setStatus("local");
    if (current.data)
      await setAccountFlag(userId, key(current.data.business.id), null);
  }, []);
  const report = useCallback(
    async (e: unknown, token: number, id: string) => {
      if (token !== epoch.current) return;
      const message = (e as Error).message;
      if (message.includes("revision_conflict")) {
        try {
          const remote = await getCloudWorkspace(id);
          if (token === epoch.current) {
            setConflict(remote);
            setStatus("conflict");
          }
        } catch (err) {
          if (token === epoch.current) setError((err as Error).message);
        }
      } else {
        setError(message);
        setStatus("error");
        if (message.includes("access_denied")) {
          suspend();
          setStatus("blocked");
        }
      }
    },
    [suspend],
  );
  const run = useCallback(async () => {
    const current = latest.current;
    if (
      active.current !== null ||
      !current.data ||
      !current.settings?.enabled ||
      current.dirty ||
      current.conflict ||
      !cloudConfigured
    )
      return;
    const token = epoch.current;
    active.current = token;
    setError("");
    setStatus("syncing");
    try {
      const decision = await synchronise(
        current.data,
        current.settings,
        () => ({
          data: latest.current.data,
          dirty: latest.current.dirty,
          cancelled:
            token !== epoch.current || !latest.current.settings?.enabled,
        }),
        getCloudWorkspace,
        syncWorkspace,
      );
      if (token !== epoch.current) return;
      if (decision.kind === "pull") await adopt(decision.remote, token);
      else if (decision.kind === "conflict") {
        setConflict(decision.remote);
        setStatus("conflict");
      } else setStatus(decision.kind === "idle" ? "synced" : "pending");
    } catch (e) {
      await report(e, token, current.data.business.id);
    } finally {
      if (active.current === token) active.current = null;
    }
  }, [adopt, report]);
  useEffect(() => {
    if (!settings?.enabled) return;
    const timer = setTimeout(() => void run(), 1200);
    return () => clearTimeout(timer);
  }, [data?.updatedAt, dirty, settings?.enabled, run]);
  useEffect(() => {
    if (!settings?.enabled) return;
    const timer = setInterval(() => void run(), 20000);
    const online = () => void run();
    window.addEventListener("online", online);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [settings?.enabled, run]);
  const prepareDownload = async (snapshot: WorkspaceSnapshot, id: string) => {
    const current = latest.current;
    if (!current.settings?.enabled)
      throw Error(
        "Team sharing stopped. Reconnect before downloading a shared document.",
      );
    if (active.current !== null || current.conflict)
      throw Error(
        "Finish syncing or resolve the cloud conflict before downloading.",
      );
    const token = epoch.current;
    active.current = token;
    setStatus("syncing");
    try {
      const result = await finaliseSharedDownload(
        id,
        snapshot,
        current.settings.revision,
        syncWorkspace,
      );
      if (token !== epoch.current || !latest.current.settings?.enabled)
        throw Error("Sync stopped. No shared PDF was issued.");
      if (
        latest.current.data?.updatedAt !== snapshot.updatedAt ||
        latest.current.dirty
      ) {
        setConflict(result.remote);
        throw Error(
          "Your workspace changed while finalising. Review both versions before downloading.",
        );
      }
      await adopt(result.remote, token);
      return result.document;
    } catch (e) {
      await report(e, token, snapshot.business.id);
      throw e;
    } finally {
      if (active.current === token) active.current = null;
    }
  };
  const resolveLocal = async () => {
    const current = latest.current;
    if (
      !current.data ||
      !current.conflict ||
      !current.settings?.enabled ||
      current.dirty
    )
      return;
    if (active.current !== null) throw Error("Sync is already in progress");
    const token = epoch.current;
    active.current = token;
    try {
      const remote = await syncWorkspace(
        current.data,
        current.conflict.revision,
      );
      if (token !== epoch.current) return;
      if (latest.current.data !== current.data || latest.current.dirty) {
        setConflict(remote);
        return;
      }
      await adopt(remote, token);
    } catch (e) {
      await report(e, token, current.data.business.id);
      throw e;
    } finally {
      if (active.current === token) active.current = null;
    }
  };
  return {
    ready,
    suspend,
    settings,
    status,
    error,
    conflict,
    adopt,
    stop,
    run,
    prepareDownload,
    resolveLocal,
    clearError: () => setError(""),
  };
}
export type SyncController = ReturnType<typeof useCloudSync>;
