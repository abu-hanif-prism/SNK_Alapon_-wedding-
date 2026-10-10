import { describe, expect, it } from "vitest";
import { mockBkashClient } from "../../src/modules/payments/bkash/bkash.mock";
import { BkashError } from "../../src/modules/payments/bkash/bkash.types";

const input = {
  amount: "499.50",
  currency: "BDT",
  invoiceNumber: "SNK-TEST123",
  payerReference: "host-1",
  callbackUrl: "http://localhost:5000/api/payments/bkash/callback",
};

describe("mock bKash client", () => {
  it("creates a payment whose URL leads back to our callback", async () => {
    const created = await mockBkashClient.createPayment(input);
    expect(created.paymentId).toMatch(/^MOCK[0-9A-F]{16}$/);
    expect(created.bkashUrl).toBe(`${input.callbackUrl}?paymentID=${created.paymentId}&status=success`);
  });

  it("reports Initiated until executed, then Completed with the original amount and invoice", async () => {
    const { paymentId } = await mockBkashClient.createPayment(input);

    const before = await mockBkashClient.queryPayment(paymentId);
    expect(before.transactionStatus).toBe("Initiated");
    expect(before.trxId).toBeNull();

    const done = await mockBkashClient.executePayment(paymentId);
    expect(done).toMatchObject({ transactionStatus: "Completed", amount: "499.50", invoiceNumber: "SNK-TEST123" });
    expect(done.trxId).toMatch(/^MOCKTRX/);

    expect((await mockBkashClient.queryPayment(paymentId)).transactionStatus).toBe("Completed");
  });

  it("refuses to execute the same payment twice, like the real API", async () => {
    const { paymentId } = await mockBkashClient.createPayment(input);
    await mockBkashClient.executePayment(paymentId);
    await expect(mockBkashClient.executePayment(paymentId)).rejects.toBeInstanceOf(BkashError);
  });

  it("rejects unknown payment ids", async () => {
    await expect(mockBkashClient.executePayment("NOPE")).rejects.toBeInstanceOf(BkashError);
    await expect(mockBkashClient.queryPayment("NOPE")).rejects.toBeInstanceOf(BkashError);
  });
});
