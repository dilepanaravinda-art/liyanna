import Decimal from "decimal.js";
export const currencies = Intl.supportedValuesOf("currency");
export function currencyDigits(currency: string) {
  if (!currencies.includes(currency))
    throw new Error("Choose a supported currency");
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits!;
}
export interface MoneyInput {
  currency: string;
  items: { quantity: string; rate: string }[];
  discountKind: "fixed" | "percent";
  discount: string;
  tax: string;
  taxKind?: "fixed" | "percent";
}
export interface Totals {
  lines: string[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
}
export function calculate(input: MoneyInput): Totals {
  const digits = currencyDigits(input.currency);
  const amount = (v: string) => {
    if (!/^\d+(\.\d{1,8})?$/.test(v) || v.length > 20)
      throw Error("Enter a valid nonnegative amount");
    return new Decimal(v);
  };
  const round = (d: Decimal) =>
    d.toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
  const lines = input.items.map((i) => {
    const q = amount(i.quantity);
    if (q.lte(0)) throw Error("Quantity must be greater than zero");
    return round(q.mul(amount(i.rate)));
  });
  const subtotal = lines.reduce((a, b) => a.plus(b), new Decimal(0));
  if (subtotal.gt("1000000000000"))
    throw Error("Document amount is too large (maximum 1 trillion)");
  const rawDiscount = amount(input.discount);
  const discount = round(
    Decimal.min(
      subtotal,
      input.discountKind === "percent"
        ? subtotal.mul(Decimal.min(rawDiscount, 100)).div(100)
        : rawDiscount,
    ),
  );
  const taxRate = amount(input.tax);
  if (input.taxKind !== "fixed" && taxRate.gt(100))
    throw Error("Tax must be between 0 and 100");
  const taxable = subtotal.minus(discount),
    tax = round(
      input.taxKind === "fixed" ? taxRate : taxable.mul(taxRate).div(100),
    );
  if (taxable.plus(tax).gt("1000000000000"))
    throw Error("Document amount is too large (maximum 1 trillion)");
  return {
    lines: lines.map((v) => v.toFixed(digits)),
    subtotal: subtotal.toFixed(digits),
    discount: discount.toFixed(digits),
    tax: tax.toFixed(digits),
    total: taxable.plus(tax).toFixed(digits),
  };
}
export function formatMoney(amount: string, currency: string, locale = "en") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(Number(amount));
}
