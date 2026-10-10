export type BkashCreateInput = {
  amount: string; // e.g. "499.00"
  currency: string;
  invoiceNumber: string;
  payerReference: string;
  callbackUrl: string;
};

export type BkashCreateResult = {
  paymentId: string;
  // Where to send the customer to approve the payment.
  bkashUrl: string;
  raw: unknown;
};

export type BkashPaymentResult = {
  paymentId: string;
  // bKash transactionStatus, e.g. "Completed", "Initiated".
  transactionStatus: string;
  trxId: string | null;
  amount: string | null;
  invoiceNumber: string | null;
  payerMsisdn: string | null;
  raw: unknown;
};

export interface BkashClient {
  createPayment(input: BkashCreateInput): Promise<BkashCreateResult>;
  // Charges the customer after they approved. Call once per payment.
  executePayment(paymentId: string): Promise<BkashPaymentResult>;
  // Read-only status check, used to recover when execute was already done.
  queryPayment(paymentId: string): Promise<BkashPaymentResult>;
}

export class BkashError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "BkashError";
  }
}
