export type Language = "en" | "si" | "ta";
export type DocumentType = "invoice" | "quote";
export interface Contact {
  name: string;
  address: string;
  email: string;
  phone: string;
}
export interface Business extends Contact {
  id: string;
  logo: string;
  currency: string;
  language: Language;
  documentLanguage: Language;
  paymentDetails: string;
}
export interface Customer extends Contact {
  id: string;
  businessId: string;
}
export interface LineItem {
  id: string;
  description: string;
  quantity: string;
  rate: string;
}
export interface Document {
  id: string;
  businessId: string;
  type: DocumentType;
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  language: Language;
  customer: Contact;
  business: Business;
  items: LineItem[];
  discountKind: "fixed" | "percent";
  discount: string;
  tax: string;
  taxKind: "fixed" | "percent";
  notes: string;
  paymentDetails: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  createdBy: string | null;
}
export interface WorkspaceSnapshot {
  version: 1;
  business: Business;
  customers: Customer[];
  documents: Document[];
  sequences: { invoice: number; quote: number };
  updatedAt: string;
}
export const uid = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString("en-CA");
export function emptyWorkspace(): WorkspaceSnapshot {
  return {
    version: 1,
    business: {
      id: uid(),
      name: "",
      address: "",
      email: "",
      phone: "",
      logo: "",
      currency: "",
      language: "en",
      documentLanguage: "en",
      paymentDetails: "",
    },
    customers: [],
    documents: [],
    sequences: { invoice: 1, quote: 1 },
    updatedAt: new Date().toISOString(),
  };
}
export function allocateLocalNumber(
  type: DocumentType,
  sequence: number,
  year = new Date().getFullYear(),
) {
  return {
    number: `${type === "invoice" ? "INV" : "QUO"}-${year}-${String(sequence).padStart(3, "0")}`,
    nextSequence: sequence + 1,
  };
}
export function blankDocument(
  business: Business,
  type: DocumentType,
  number: string,
): Document {
  const now = new Date().toISOString();
  return {
    id: uid(),
    businessId: business.id,
    type,
    number,
    issueDate: today(),
    dueDate: "",
    currency: business.currency,
    language: business.documentLanguage,
    customer: { name: "", address: "", email: "", phone: "" },
    business: structuredClone(business),
    items: [{ id: uid(), description: "", quantity: "1", rate: "0" }],
    discountKind: "fixed",
    discount: "0",
    tax: "0",
    taxKind: "percent",
    notes: "",
    paymentDetails: business.paymentDetails,
    createdAt: now,
    updatedAt: now,
    revision: 0,
    createdBy: null,
  };
}
