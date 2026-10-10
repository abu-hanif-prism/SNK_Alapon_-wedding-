import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { getParam, getQuery } from "../../lib/params";
import type { AdminListPaymentsQuery, BkashCallbackQuery } from "./payments.schema";
import * as paymentsService from "./payments.service";

export const startBkash = asyncHandler(async (req, res) => {
  const result = await paymentsService.startBkashPayment(req.auth!.userId, req.body.subscriptionId);
  res.status(201).json({ success: true, data: result });
});

// Browser redirect from bKash: finish the payment, then send the customer back to the frontend.
export const bkashCallback = asyncHandler(async (_req, res) => {
  const { paymentID, status } = getQuery<BkashCallbackQuery>(res);
  const outcome = await paymentsService.handleBkashCallback(paymentID, status);

  const target = new URL("/payment/result", env.FRONTEND_URL);
  target.searchParams.set("status", outcome.status);
  if (outcome.subscriptionId) target.searchParams.set("subscriptionId", outcome.subscriptionId);

  res.redirect(target.toString());
});

export const getMine = asyncHandler(async (req, res) => {
  const payment = await paymentsService.getPaymentForHost(req.auth!.userId, getParam(req, "id"));
  res.json({ success: true, data: { payment } });
});

export const adminList = asyncHandler(async (_req, res) => {
  const result = await paymentsService.listForAdmin(getQuery<AdminListPaymentsQuery>(res));
  res.json({ success: true, data: result });
});
