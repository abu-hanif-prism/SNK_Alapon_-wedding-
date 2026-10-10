import { randomBytes } from "node:crypto";
import { env } from "../../config/env";
import { Prisma } from "../../generated/prisma/client";
import { HttpError } from "../../lib/httpError";
import { toSkipTake } from "../../lib/params";
import { prisma } from "../../lib/prisma";
import { activateSubscription } from "../subscriptions/subscriptions.service";
import { bkash } from "./bkash/bkash.client";
import type { BkashPaymentResult } from "./bkash/bkash.types";
import type { AdminListPaymentsQuery } from "./payments.schema";

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export type CallbackOutcome = {
  status: "success" | "failed" | "error";
  subscriptionId: string | null;
};

export async function startBkashPayment(hostId: string, subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, hostId },
    include: { plan: { select: { currency: true } } },
  });

  if (!subscription) throw HttpError.notFound("Subscription not found");

  // bKash payments are tied to a verified mobile number.
  const host = await prisma.user.findUniqueOrThrow({ where: { id: hostId }, select: { phoneVerifiedAt: true } });
  if (!host.phoneVerifiedAt) {
    throw new HttpError(403, "Please verify your mobile number before paying", { code: "PHONE_NOT_VERIFIED" });
  }

  if (subscription.status !== "PENDING_PAYMENT") {
    throw HttpError.conflict("This subscription is not awaiting payment");
  }
  if (subscription.pricePaid.lte(0)) throw HttpError.badRequest("Nothing to pay for this subscription");

  const payment = await prisma.payment.create({
    data: {
      subscriptionId,
      provider: "BKASH",
      invoiceNumber: `SNK-${randomBytes(6).toString("hex").toUpperCase()}`,
      amount: subscription.pricePaid,
      currency: subscription.plan.currency,
    },
  });

  try {
    const created = await bkash.createPayment({
      amount: subscription.pricePaid.toFixed(2),
      currency: payment.currency,
      invoiceNumber: payment.invoiceNumber,
      payerReference: hostId,
      callbackUrl: env.BKASH_CALLBACK_URL,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: created.paymentId, providerResponse: toJson(created.raw) },
    });

    return { paymentId: payment.id, bkashUrl: created.bkashUrl };
  } catch (error) {
    console.error("bKash create payment failed:", error);
    await markFailed(payment.id, { error: String(error) });
    throw new HttpError(502, "Could not start the bKash payment. Please try again.");
  }
}

async function markFailed(paymentId: string, raw: unknown) {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "INITIATED" },
    data: { status: "FAILED", providerResponse: toJson(raw) },
  });
}

// Runs when bKash sends the customer's browser back to us. The query string is NOT trusted:
// the result always comes from a server-to-server call to bKash.
export async function handleBkashCallback(paymentId: string, callbackStatus: string): Promise<CallbackOutcome> {
  const payment = await prisma.payment.findFirst({ where: { provider: "BKASH", providerPaymentId: paymentId } });
  if (!payment) return { status: "failed", subscriptionId: null };

  const { id, subscriptionId } = payment;

  if (payment.status === "COMPLETED") return { status: "success", subscriptionId };
  if (payment.status !== "INITIATED") return { status: "failed", subscriptionId };

  if (callbackStatus !== "success") {
    await markFailed(id, { callbackStatus });
    return { status: "failed", subscriptionId };
  }

  let result: BkashPaymentResult;
  try {
    result = await bkash.executePayment(paymentId);
  } catch (executeError) {
    // A repeated callback makes execute fail even though the payment went through, so ask bKash.
    try {
      result = await bkash.queryPayment(paymentId);
    } catch (queryError) {
      console.error("bKash execute and query both failed:", executeError, queryError);
      return { status: "error", subscriptionId };
    }
  }

  const amountMatches = result.amount !== null && new Prisma.Decimal(result.amount).equals(payment.amount);
  const invoiceMatches = result.invoiceNumber === payment.invoiceNumber;

  if (result.transactionStatus !== "Completed" || !amountMatches || !invoiceMatches) {
    console.error("bKash payment rejected", { paymentId, transactionStatus: result.transactionStatus, amountMatches, invoiceMatches });
    await markFailed(id, result.raw);
    return { status: "failed", subscriptionId };
  }

  // Only one concurrent callback can move INITIATED -> COMPLETED, so activation happens once.
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id, status: "INITIATED" },
      data: {
        status: "COMPLETED",
        trxId: result.trxId,
        payerMsisdn: result.payerMsisdn,
        paidAt: new Date(),
        providerResponse: toJson(result.raw),
      },
    });

    if (claimed.count === 1) await activateSubscription(tx, subscriptionId);
  });

  return { status: "success", subscriptionId };
}

export async function getPaymentForHost(hostId: string, id: string) {
  const payment = await prisma.payment.findFirst({
    where: { id, subscription: { hostId } },
    omit: { providerResponse: true },
  });
  if (!payment) throw HttpError.notFound("Payment not found");
  return payment;
}

export async function listForAdmin(query: AdminListPaymentsQuery) {
  const where: Prisma.PaymentWhereInput = query.status ? { status: query.status } : {};

  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, orderBy: { createdAt: "desc" }, ...toSkipTake(query) }),
    prisma.payment.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit };
}
