import { randomBytes } from "node:crypto";
import {
  BkashError,
  type BkashClient,
  type BkashCreateInput,
  type BkashCreateResult,
  type BkashPaymentResult,
} from "./bkash.types";

// Fake bKash for local development (BKASH_MODE=mock). Makes no network calls.
// "Approving" the payment is simply opening the returned bkashUrl, which hits our own callback.
// State is in memory, so a payment created before a server restart can no longer be executed.

type MockPayment = BkashCreateInput & { executed: boolean; trxId: string };
const payments = new Map<string, MockPayment>();

function requirePayment(paymentId: string): MockPayment {
  const payment = payments.get(paymentId);
  if (!payment) throw new BkashError("Mock bKash: unknown paymentID", "2056");
  return payment;
}

function toResult(paymentId: string, payment: MockPayment): BkashPaymentResult {
  return {
    paymentId,
    transactionStatus: payment.executed ? "Completed" : "Initiated",
    trxId: payment.executed ? payment.trxId : null,
    amount: payment.amount,
    invoiceNumber: payment.invoiceNumber,
    payerMsisdn: payment.executed ? "01700000000" : null,
    raw: { mock: true, paymentID: paymentId },
  };
}

export const mockBkashClient: BkashClient = {
  async createPayment(input: BkashCreateInput): Promise<BkashCreateResult> {
    const paymentId = `MOCK${randomBytes(8).toString("hex").toUpperCase()}`;
    payments.set(paymentId, { ...input, executed: false, trxId: `MOCKTRX${randomBytes(5).toString("hex").toUpperCase()}` });

    const bkashUrl = `${input.callbackUrl}?paymentID=${paymentId}&status=success`;
    return { paymentId, bkashUrl, raw: { mock: true, paymentID: paymentId } };
  },

  async executePayment(paymentId) {
    const payment = requirePayment(paymentId);
    if (payment.executed) throw new BkashError("Mock bKash: payment already executed", "2062");
    payment.executed = true;
    return toResult(paymentId, payment);
  },

  async queryPayment(paymentId) {
    return toResult(paymentId, requirePayment(paymentId));
  },
};
