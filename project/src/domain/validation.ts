import { z } from "zod";
import { currencies, calculate } from "./money";
const text = z.string().max(10000);
const contact = {
  name: z.string().trim().min(1, "Name is required").max(200),
  address: text,
  email: z.string().max(250),
  phone: z.string().max(100),
};
const language = z.enum(["en", "si", "ta"]);
const currency = z
  .string()
  .refine((v) => currencies.includes(v), "Choose a currency");
const amount = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, "Enter a positive number")
  .max(20);
export const logoSchema = z
  .string()
  .max(2_900_000)
  .refine(
    (s) =>
      s === "" ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(s),
    "Choose a PNG, JPEG or WebP logo under 2 MB",
  );
export const businessSchema = z.object({
  ...contact,
  id: z.string().min(1),
  logo: logoSchema,
  currency,
  language,
  documentLanguage: language,
  paymentDetails: text,
});
export const customerSchema = z.object({
  ...contact,
  id: z.string().min(1),
  businessId: z.string().min(1),
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Choose a valid date",
  );
export const draftSchema = z
  .object({
    id: z.string().min(1),
    businessId: z.string().min(1),
    type: z.enum(["invoice", "quote"]),
    number: z.string().trim().min(1).max(80),
    issueDate: date,
    dueDate: z.union([z.literal(""), date]),
    currency,
    language,
    customer: z.object({ ...contact, name: z.string().max(200) }),
    business: businessSchema,
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          description: z.string().max(2000),
          quantity: amount.refine(
            (v) => Number(v) > 0,
            "Quantity must be greater than zero",
          ),
          rate: amount,
        }),
      )
      .min(1)
      .max(500),
    discountKind: z.enum(["fixed", "percent"]),
    discount: amount,
    tax: amount,
    taxKind: z.enum(["fixed", "percent"]).default("percent"),
    notes: text,
    paymentDetails: text,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    revision: z.number().int().nonnegative(),
    createdBy: z.string().nullable(),
  })
  .refine(
    (d) => !d.dueDate || d.dueDate >= d.issueDate,
    "Due date must not be before issue date",
  )
  .superRefine((d, ctx) => {
    try {
      calculate(d);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
  });
export const documentSchema = draftSchema.superRefine((d, ctx) => {
  if (!d.customer.name.trim())
    ctx.addIssue({
      code: "custom",
      path: ["customer", "name"],
      message: "Add a customer name before downloading",
    });
  d.items.forEach((item, i) => {
    if (!item.description.trim())
      ctx.addIssue({
        code: "custom",
        path: ["items", i, "description"],
        message: "Add an item description before downloading",
      });
  });
});
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    business: businessSchema,
    customers: z.array(customerSchema).max(20000),
    documents: z.array(draftSchema).max(10000),
    sequences: z.object({
      invoice: z.number().int().positive(),
      quote: z.number().int().positive(),
    }),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((s, ctx) => {
    const ids = [
      ...s.customers.map((c) => c.id),
      ...s.documents.map((d) => d.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate record IDs" });
    if (
      s.documents.some((d) => d.businessId !== s.business.id) ||
      s.customers.some((c) => c.businessId !== s.business.id)
    )
      ctx.addIssue({
        code: "custom",
        message: "Records belong to another business",
      });
    const numbers = s.documents.map((d) => `${d.type}:${d.number}`);
    if (new Set(numbers).size !== numbers.length)
      ctx.addIssue({ code: "custom", message: "Duplicate document numbers" });
  });
