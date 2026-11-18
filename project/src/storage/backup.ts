import type { WorkspaceSnapshot } from "../domain/model";
import { workspaceSchema } from "../domain/validation";
export function exportBackup(snapshot: WorkspaceSnapshot): string {
  return JSON.stringify(workspaceSchema.parse(snapshot), null, 2);
}
export function parseBackup(text: string): WorkspaceSnapshot {
  if (text.length > 50_000_000) throw Error("Backup exceeds 50 MB");
  try {
    return workspaceSchema.parse(JSON.parse(text)) as WorkspaceSnapshot;
  } catch {
    throw Error(
      "This is not a valid Liyanna v1 backup. Your existing records have not changed.",
    );
  }
}
export function downloadFile(
  data: string | Blob,
  name: string,
  type = "application/json",
) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function readLogo(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  )
    throw Error("Choose a PNG, JPEG or WebP image under 2 MB");
  const source = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(Error("Could not read image"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(Error("This file is not a readable image"));
    i.src = source;
  });
  const scale = Math.min(1, 1200 / img.width, 1200 / img.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
