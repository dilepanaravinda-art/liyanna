import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Document } from "../domain/model";
import { calculate, formatMoney } from "../domain/money";
import { copy } from "../i18n";
export type TextRenderer = (
  text: string,
  width?: number,
  size?: number,
  bold?: boolean,
  color?: string,
) => Promise<Content>;
export async function buildDefinition(
  d: Document,
  text: TextRenderer,
): Promise<TDocumentDefinitions> {
  const t = copy(d.language),
    totals = calculate(d),
    money = (v: string) => formatMoney(v, d.currency, d.language);
  async function section(
    label: string,
    value: string,
    size: number,
  ): Promise<Content> {
    // Keep the heading and a bounded opening paragraph together, while long sections remain pageable.
    let end = Math.min(value.length, 220);
    const fourthNewline = [...value.matchAll(/\n/g)][3]?.index;
    if (fourthNewline !== undefined) end = Math.min(end, fourthNewline);
    if (end < value.length) {
      const boundary = value.lastIndexOf(" ", end);
      if (boundary > end / 2) end = boundary;
    }
    return {
      stack: [
        {
          unbreakable: true,
          stack: [
            await text(label, 515, 10, true),
            await text(value.slice(0, end), 515, size),
          ],
        },
        ...(end < value.length
          ? [await text(value.slice(end).trimStart(), 515, size)]
          : []),
      ],
      margin: [0, 8, 0, 12],
    };
  }
  const heading =
    d.language === "en"
      ? d.type === "invoice"
        ? "INVOICE"
        : "Quotation"
      : t[d.type];
  const rows: Content[][] = [];
  rows.push(
    await Promise.all(
      [
        t.description,
        t.qty,
        `${t.rate} (${d.currency})`,
        `${t.amount} (${d.currency})`,
      ].map((v, i) => text(v, [245, 40, 80, 100][i], 9, true, "#45636c")),
    ),
  );
  for (let i = 0; i < d.items.length; i++) {
    const item = d.items[i];
    rows.push([
      await text(item.description, 245, 10),
      { text: item.quantity, alignment: "right" },
      {
        text: money(item.rate).replace(d.currency, "").trim(),
        alignment: "right",
      },
      {
        text: money(totals.lines[i]).replace(d.currency, "").trim(),
        alignment: "right",
      },
    ]);
  }
  const summary: Content[][] = [
    [
      await text(t.subtotal, 120, 10),
      { text: money(totals.subtotal), alignment: "right" },
    ],
  ];
  if (Number(totals.discount))
    summary.push([
      await text(
        `${t.discount}${d.discountKind === "percent" ? ` (${d.discount}%)` : ` (${d.currency})`}`,
        120,
        10,
      ),
      { text: "− " + money(totals.discount), alignment: "right" },
    ]);
  if (Number(totals.tax))
    summary.push([
      await text(
        `${t.tax} (${d.tax}${d.taxKind === "fixed" ? ` ${d.currency}` : "%"})`,
        120,
        10,
      ),
      { text: money(totals.tax), alignment: "right" },
    ]);
  summary.push([
    await text(t.total, 120, 12, true, "#00676b"),
    {
      text: money(totals.total),
      alignment: "right",
      bold: true,
      color: "#00676b",
      fontSize: 12,
      fillColor: "#eaf5f3",
    },
  ]);
  const content: Content[] = [
    {
      columns: [
        {
          width: "*",
          stack: [
            ...(d.business.logo
              ? [{ image: d.business.logo, fit: [140, 65] } as Content]
              : []),
            {
              ...((await text(
                d.business.name,
                270,
                20,
                true,
                "#183f44",
              )) as object),
              margin: [0, d.business.logo ? 10 : 0, 0, 0],
            } as Content,
          ],
        },
        {
          width: 200,
          stack: [
            await text(d.business.address, 200, 9),
            await text(
              [d.business.email, d.business.phone].filter(Boolean).join("\n"),
              200,
              9,
            ),
          ],
          alignment: "right",
        },
      ],
      margin: [0, 0, 0, 24],
    },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1,
          lineColor: "#bfd8d5",
        },
      ],
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        { width: "*", stack: [await text(heading, 285, 27, true, "#00676b")] },
        {
          width: 200,
          stack: [
            await text(`${t.number}: ${d.number}`, 200, 9),
            await text(`${t.issueDate}: ${d.issueDate}`, 200, 9),
            ...(d.dueDate
              ? [
                  await text(
                    `${d.type === "invoice" ? t.dueDate : t.validUntil}: ${d.dueDate}`,
                    200,
                    9,
                  ),
                ]
              : []),
          ],
        },
      ],
      margin: [0, 0, 0, 24],
    },
    {
      stack: [
        await text(
          d.type === "invoice" ? t.billTo : t.quoteFor,
          320,
          9,
          false,
          "#7a8c94",
        ),
        await text(d.customer.name, 320, 12, true),
        await text(
          [d.customer.address, d.customer.email, d.customer.phone]
            .filter(Boolean)
            .join("\n"),
          320,
          9,
        ),
      ],
      margin: [0, 0, 0, 22],
    },
    {
      table: {
        headerRows: 1,
        widths: ["*", 40, 80, 100],
        body: rows,
        dontBreakRows: d.items.every(
          (item) =>
            item.description.length <= 600 &&
            item.description.split("\n").length <= 12,
        ),
      },
      layout: {
        hLineWidth: (i) => (i === 0 ? 0 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => "#e0e9eb",
        fillColor: (row) => (row === 0 ? "#edf4f5" : null),
        paddingTop: () => 10,
        paddingBottom: () => 10,
      },
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        { text: "", width: "*" },
        {
          width: 265,
          unbreakable: true,
          table: { widths: [120, "*"], body: summary },
          layout: "noBorders",
        },
      ],
      margin: [0, 0, 0, 20],
    },
  ];
  if (d.notes) content.push(await section(t.notes, d.notes, 10));
  if (d.paymentDetails)
    content.push(await section(t.paymentDetails, d.paymentDetails, 9));
  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 45],
    info: {
      title: `${d.number} — ${d.business.name}`,
      author: d.business.name,
    },
    defaultStyle: {
      font: "NotoSans",
      fontSize: 10,
      color: "#29434e",
      lineHeight: 1.35,
    },
    content,
    footer: (current, count) => ({
      text: `${current} / ${count}`,
      alignment: "right",
      margin: [40, 12, 40, 0],
      fontSize: 8,
      color: "#899ca4",
    }),
  };
}
