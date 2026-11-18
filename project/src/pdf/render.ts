import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Document as BusinessDocument } from "../domain/model";
import { documentSchema } from "../domain/validation";
import { buildDefinition, type TextRenderer } from "./template";
import { downloadFile } from "../storage/backup";
interface LocalPdfMake {
  vfs: Record<string, string>;
  fonts: Record<
    string,
    { normal: string; bold: string; italics: string; bolditalics: string }
  >;
  createPdf: (def: TDocumentDefinitions) => {
    getBlob: (callback: (blob: Blob) => void) => void;
  };
}
let engine: Promise<LocalPdfMake> | undefined;
async function pdfEngine() {
  if (!engine)
    engine = (async () => {
      const module = await import("pdfmake/build/pdfmake");
      const pdf = module.default as unknown as LocalPdfMake;
      const entries = await Promise.all(
        ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map(async (name) => {
          const r = await fetch(`/fonts/${name}`);
          if (!r.ok) throw Error("Could not load local PDF fonts");
          const array = new Uint8Array(await r.arrayBuffer());
          let binary = "";
          for (let i = 0; i < array.length; i += 8192)
            binary += String.fromCharCode(...array.subarray(i, i + 8192));
          return [name, btoa(binary)];
        }),
      );
      pdf.vfs = Object.fromEntries(entries);
      pdf.fonts = {
        NotoSans: {
          normal: "NotoSans-Regular.ttf",
          bold: "NotoSans-Bold.ttf",
          italics: "NotoSans-Regular.ttf",
          bolditalics: "NotoSans-Bold.ttf",
        },
      };
      return pdf;
    })();
  try {
    return await engine;
  } catch (e) {
    engine = undefined;
    throw e;
  }
}
// Chromium's native text shaping preserves Sinhala/Tamil clusters that the PDF engine cannot reliably position.
// Only script-bearing paragraphs become high-resolution images; Latin text stays selectable.
const localText: TextRenderer = async (
  value,
  width = 250,
  size = 10,
  bold = false,
  color = "#29434e",
): Promise<Content> => {
  if (!/[\u0B80-\u0BFF\u0D80-\u0DFF]/.test(value))
    return { text: value, bold, color, fontSize: size };
  await document.fonts.load(`${bold ? 700 : 400} ${size}px Sinhala`);
  await document.fonts.load(`${bold ? 700 : 400} ${size}px Tamil`);
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const ratio = 3;
  const font = `${bold ? 700 : 400} ${size * ratio}px Noto, Sinhala, Tamil`;
  ctx.font = font;
  const lines: string[] = [];
  for (const paragraph of value.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/(\s+)/)) {
      if (ctx.measureText(line + word).width > width * ratio && line) {
        lines.push(line.trimEnd());
        line = "";
      }
      if (ctx.measureText(word).width > width * ratio) {
        const segments = new Intl.Segmenter(undefined, {
          granularity: "grapheme",
        }).segment(word);
        for (const { segment } of segments) {
          if (ctx.measureText(line + segment).width > width * ratio && line) {
            lines.push(line);
            line = "";
          }
          line += segment;
        }
      } else line += word;
    }
    lines.push(line.trimEnd());
  }
  const lineHeight = size * 1.75 * ratio;
  const parts: Content[] = [];
  // Small chunks let pdfmake paginate long notes and descriptions without scaling or clipping a tall image.
  for (let start = 0; start < lines.length; start += 6) {
    const chunk = lines.slice(start, start + 6);
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.max(1, Math.ceil((chunk.length + 0.15) * lineHeight));
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    chunk.forEach((line, i) =>
      ctx.fillText(line, 0, i * lineHeight + size * 0.15 * ratio),
    );
    parts.push({
      image: canvas.toDataURL("image/png"),
      width,
      height: canvas.height / ratio,
    });
  }
  return parts.length === 1 ? parts[0] : { stack: parts };
};
export async function createDocumentBlob(
  input: BusinessDocument,
): Promise<Blob> {
  const d = documentSchema.parse(input);
  const pdf = await pdfEngine();
  const def = await buildDefinition(d, localText);
  return new Promise((resolve, reject) => {
    try {
      pdf.createPdf(def).getBlob(resolve);
    } catch (e) {
      reject(e);
    }
  });
}
export async function downloadDocument(d: BusinessDocument) {
  const blob = await createDocumentBlob(d);
  downloadFile(
    blob,
    `${d.number.replace(/[^\p{L}\p{N}_-]/gu, "-")}.pdf`,
    "application/pdf",
  );
}
