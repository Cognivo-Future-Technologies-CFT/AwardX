export type InvoiceStatus = 'PAID' | 'OPEN' | 'VOID' | 'UNCOLLECTIBLE';

export interface Invoice {
  id: string;
  organizationId: string;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  date: string; // ISO Date String
  pdfUrl: string;
}
