import { env } from "../../../config/env";
import {
  BkashError,
  type BkashClient,
  type BkashCreateInput,
  type BkashCreateResult,
  type BkashPaymentResult,
} from "./bkash.types";

// bKash Tokenized Checkout. Flow: grant token -> create -> (customer approves) -> execute -> query.
// NOTE: written from bKash's documented API; not yet exercised against the real sandbox.

type TokenCache = { idToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

async function post(path: string, body: unknown, headers: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch(`${env.BKASH_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new BkashError(`bKash HTTP ${response.status}`, undefined, data);
  }
  return data;
}

async function getIdToken(): Promise<string> {
  // Refresh a minute early so a token never expires mid-request.
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.idToken;

  const data = await post(
    "/tokenized/checkout/token/grant",
    { app_key: env.BKASH_APP_KEY, app_secret: env.BKASH_APP_SECRET },
    { username: env.BKASH_USERNAME, password: env.BKASH_PASSWORD },
  );

  const idToken = data["id_token"];
  if (typeof idToken !== "string") {
    throw new BkashError(String(data["statusMessage"] ?? "bKash token grant failed"), String(data["statusCode"]), data);
  }

  tokenCache = { idToken, expiresAt: Date.now() + Number(data["expires_in"] ?? 3600) * 1000 };
  return idToken;
}

async function authedPost(path: string, body: unknown) {
  const data = await post(path, body, { Authorization: await getIdToken(), "X-APP-Key": env.BKASH_APP_KEY });

  // "0000" is bKash's success code; anything else is an error even on HTTP 200.
  if (data["statusCode"] !== undefined && data["statusCode"] !== "0000") {
    throw new BkashError(String(data["statusMessage"] ?? "bKash request failed"), String(data["statusCode"]), data);
  }
  return data;
}

const str = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : null);

function toPaymentResult(data: Record<string, unknown>): BkashPaymentResult {
  return {
    paymentId: String(data["paymentID"] ?? ""),
    transactionStatus: String(data["transactionStatus"] ?? ""),
    trxId: str(data["trxID"]),
    amount: str(data["amount"]),
    invoiceNumber: str(data["merchantInvoiceNumber"]),
    payerMsisdn: str(data["customerMsisdn"]),
    raw: data,
  };
}

export const liveBkashClient: BkashClient = {
  async createPayment(input: BkashCreateInput): Promise<BkashCreateResult> {
    const data = await authedPost("/tokenized/checkout/create", {
      mode: "0011",
      payerReference: input.payerReference,
      callbackURL: input.callbackUrl,
      amount: input.amount,
      currency: input.currency,
      intent: "sale",
      merchantInvoiceNumber: input.invoiceNumber,
    });

    const paymentId = str(data["paymentID"]);
    const bkashUrl = str(data["bkashURL"]);
    if (!paymentId || !bkashUrl) throw new BkashError("bKash create returned no paymentID/bkashURL", undefined, data);

    return { paymentId, bkashUrl, raw: data };
  },

  async executePayment(paymentId) {
    return toPaymentResult(await authedPost("/tokenized/checkout/execute", { paymentID: paymentId }));
  },

  async queryPayment(paymentId) {
    return toPaymentResult(await authedPost("/tokenized/checkout/payment/status", { paymentID: paymentId }));
  },
};
