import PdfPrinter from "pdfmake";
export async function makeProbe(
  loadFont: (name: string) => Uint8Array,
): Promise<Uint8Array> {
  const fonts = Object.fromEntries(
    ["NotoSans", "NotoSansSinhala", "NotoSansTamil"].map((name) => [
      name,
      {
        normal: Buffer.from(loadFont(`${name}-Regular.ttf`)),
        bold: Buffer.from(loadFont(`${name}-Bold.ttf`)),
      },
    ]),
  );
  const printer = new PdfPrinter(fonts);
  const pdf = printer.createPdfKitDocument({
    defaultStyle: { font: "NotoSans" },
    content: [
      { text: "Liyanna • Invoice / Quotation", fontSize: 24, bold: true },
      {
        text: "ආයුබෝවන් — ඉන්වොයිසිය — ස්තූතියි",
        font: "NotoSansSinhala",
        fontSize: 18,
        margin: [0, 12, 0, 12],
      },
      {
        text: "வணக்கம் — விலைப்பட்டியல் — நன்றி",
        font: "NotoSansTamil",
        fontSize: 18,
      },
      {
        text: [
          { text: "Design / " },
          { text: "නිර්මාණය", font: "NotoSansSinhala" },
          { text: " / " },
          { text: "வடிவமைப்பு", font: "NotoSansTamil" },
        ],
        margin: [0, 12, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto"],
          body: [
            ["Description", "Amount"],
            ...Array.from({ length: 100 }, (_, i) => [
              `Service ${i + 1}`,
              "1,000.00",
            ]),
          ],
        },
      },
    ],
  });
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    pdf.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    pdf.on("error", reject);
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.end();
  });
}
