export const DOCUMENT_TYPES = [
  "Certificate of Employment",
  "NOC",
  "Salary Certificate",
  "Employment Release Letter",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && DOCUMENT_TYPES.includes(value as DocumentType);
}
