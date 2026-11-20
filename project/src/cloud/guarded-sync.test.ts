import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "../domain/model";
import { persistCloudAdoption } from "./guarded-sync";

describe("cloud adoption persistence", () => {
 it("saves incoming records before advancing cloud metadata", async () => {
   const order: string[] = [];
   expect(await persistCloudAdoption(emptyWorkspace(), () => true,
     async () => { order.push("snapshot"); },
     async () => { order.push("metadata"); })).toBe(true);
   expect(order).toEqual(["snapshot", "metadata"]);
 });
 it("preserves the previous revision when local storage fails", async () => {
   let revision = 3;
   await expect(persistCloudAdoption(emptyWorkspace(), () => true,
     async () => { throw Error("Storage full"); },
     async () => { revision = 4; })).rejects.toThrow("Storage full");
   expect(revision).toBe(3);
 });
 it("does not advance metadata after sharing stops during the save", async () => {
   let active = true, metadataSaved = false;
   expect(await persistCloudAdoption(emptyWorkspace(), () => active,
     async () => { active = false; },
     async () => { metadataSaved = true; })).toBe(false);
   expect(metadataSaved).toBe(false);
 });
 it("does not save after the operation has been cancelled", async () => {
   let saved = false;
   expect(await persistCloudAdoption(emptyWorkspace(), () => false,
     async () => { saved = true; },
     async () => { saved = true; })).toBe(false);
   expect(saved).toBe(false);
 });
 it("reports metadata failure after the snapshot was persisted", async () => {
   let persisted = false;
   await expect(persistCloudAdoption(emptyWorkspace(), () => true,
     async () => { persisted = true; },
     async () => { throw Error("Metadata storage failed"); })).rejects.toThrow("Metadata storage failed");
   expect(persisted).toBe(true);
 });
});
