import { env } from "../config/env";

// Sends text messages. SMS_MODE=mock (default) only logs, so development needs no SMS account.
// SMS_MODE=live posts to a generic HTTP gateway (SMS_API_URL). NOTE: the live branch is written for a
// typical Bangladesh bulk-SMS gateway (api key + sender id + number + message) and has never been run;
// adjust the request body to match whichever provider you sign up with.
export async function sendSms(to: string, message: string): Promise<void> {
  if (env.SMS_MODE === "mock") {
    console.log(`[mock SMS] to ${to}: ${message}`);
    return;
  }

  const response = await fetch(env.SMS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: env.SMS_API_KEY, senderid: env.SMS_SENDER_ID, number: to, message }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`SMS gateway answered HTTP ${response.status}`);
}
