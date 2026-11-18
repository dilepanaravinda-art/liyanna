import { openDB } from "idb";
import type { WorkspaceRepository } from "./repository";
import type { WorkspaceSnapshot } from "../domain/model";
import { workspaceSchema } from "../domain/validation";
export function createLocalRepository(
  name = "liyanna-v1",
): WorkspaceRepository {
  const database = () =>
    openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore("workspace");
      },
    });
  return {
    async load() {
      const db = await database();
      try {
        const value = await db.get("workspace", "current");
        return value
          ? (workspaceSchema.parse(value) as WorkspaceSnapshot)
          : null;
      } finally {
        db.close();
      }
    },
    async save(snapshot, expectedUpdatedAt) {
      const checked = workspaceSchema.parse(snapshot);
      const db = await database();
      try {
        const tx = db.transaction("workspace", "readwrite");
        const current = await tx.store.get("current");
        if (
          expectedUpdatedAt !== undefined &&
          (current?.updatedAt ?? null) !== expectedUpdatedAt
        ) {
          await tx.done;
          throw Error(
            "Another tab updated this workspace. Keep your edits safe before reloading.",
          );
        }
        await tx.store.put(checked, "current");
        await tx.done;
      } finally {
        db.close();
      }
    },
  };
}
export async function getLocalFlag<T>(key: string): Promise<T | undefined> {
  const db = await openDB("liyanna-preferences", 1, {
    upgrade(d) {
      d.createObjectStore("preferences");
    },
  });
  try {
    return await db.get("preferences", key);
  } finally {
    db.close();
  }
}
export async function setLocalFlag(key: string, value: unknown) {
  const db = await openDB("liyanna-preferences", 1, {
    upgrade(d) {
      d.createObjectStore("preferences");
    },
  });
  try {
    await db.put("preferences", value, key);
  } finally {
    db.close();
  }
}
