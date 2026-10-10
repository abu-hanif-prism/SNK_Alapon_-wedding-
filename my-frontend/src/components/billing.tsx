"use client";
import { useState } from "react";
import Link from "next/link";
import { useData } from "./data";
import { Heading, Loading, Notice, Empty, Action, Badge } from "./ui";
import { request, safeUrl } from "@/lib/api";
import { bytes, formatDate, type Plan, type Subscription } from "@/lib/types";
export function Billing() {
  const plans = useData<{ plans: Plan[] }>("/plans", false);
  const subs = useData<{ subscriptions: Subscription[] }>("/subscriptions");
  const [checkout, setCheckout] = useState<string | null>(null);
  return (
    <>
      <Heading
        eyebrow="Room for every memory"
        title="Your plans & subscriptions"
      >
        Choose the edition that feels like your day.
      </Heading>
      <Notice error>{plans.error || subs.error}</Notice>
      {plans.loading ? (
        <Loading />
      ) : (
        <div className="grid-3">
          {plans.data?.plans.map((p, i) => (
            <article
              key={p.id}
              className={"panel plan-card " + (i === 1 ? "selected" : "")}
            >
              <div>
                <h2>{p.name}</h2>
                <p>{p.edition} curated photographs, beautifully arranged.</p>
              </div>
              <div className="price">
                ৳{Number(p.price).toLocaleString()}
                <p>
                  <small>
                    {p.durationMonths
                      ? p.durationMonths + " months"
                      : p.billingPeriod.replace("_", " ").toLowerCase()}
                  </small>
                </p>
              </div>
              <ul>
                <li>
                  {p.maxEvents} event{p.maxEvents > 1 ? "s" : ""}
                </li>
                <li>{bytes(p.storageLimitBytes)} photo storage</li>
                <li>Guest uploads via link or QR</li>
                <li>Your own public gallery</li>
              </ul>
              <Action
                onClick={async () => {
                  const d = await request<{ subscription: Subscription }>(
                    "/subscriptions",
                    "POST",
                    { planId: p.id },
                  );
                  setCheckout(d.subscription.id);
                  subs.reload();
                }}
              >
                Choose {p.name}
              </Action>
            </article>
          ))}
        </div>
      )}
      {checkout && (
        <div className="panel" style={{ marginTop: 24 }}>
          <h2>Complete your purchase</h2>
          <p>You will be redirected to bKash to authorize payment.</p>
          <Action
            className="button purple"
            onClick={async () => {
              const d = await request<{ bkashUrl: string }>(
                "/payments/bkash/create",
                "POST",
                { subscriptionId: checkout },
              );
              location.assign(safeUrl(d.bkashUrl));
            }}
          >
            Pay with bKash
          </Action>
        </div>
      )}
      <h2 style={{ marginTop: 48 }}>Your subscriptions</h2>
      <div className="stack">
        {subs.data?.subscriptions.map((s) => (
          <article className="panel" key={s.id}>
            <div className="actions">
              <h3 style={{ margin: 0 }}>{s.plan?.name || "Wedding edition"}</h3>
              <Badge>{s.status}</Badge>
            </div>
            <p>
              {s.edition} photos · {s.maxEvents} events · {bytes(s.usedBytes)}{" "}
              of {bytes(s.storageLimitBytes)} used
              {s.endsAt ? " · Until " + formatDate(s.endsAt) : ""}
            </p>
            {s.status === "PENDING_PAYMENT" ? (
              <button className="button" onClick={() => setCheckout(s.id)}>
                Continue payment
              </button>
            ) : s.status === "ACTIVE" ? (
              <Link className="button secondary" href="/dashboard/events/new">
                Create an event
              </Link>
            ) : null}
          </article>
        ))}
      </div>
      {subs.data?.subscriptions.length === 0 && (
        <Empty title="Your story starts here">
          <p>Choose a plan above to create your first event.</p>
        </Empty>
      )}
    </>
  );
}
export function PaymentResult({ subscriptionId }: { subscriptionId?: string }) {
  const { data, error, loading, reload } = useData<{
    subscription: Subscription;
  }>(
    subscriptionId
      ? "/subscriptions/" + encodeURIComponent(subscriptionId)
      : null,
  );
  const active = data?.subscription.status === "ACTIVE";
  return (
    <div className="container" style={{ maxWidth: 650, textAlign: "center" }}>
      <Heading
        title={
          active ? "Your next chapter starts now" : "Checking your payment"
        }
      >
        Your subscription status is verified with the server.
      </Heading>
      {subscriptionId && loading ? (
        <Loading />
      ) : (
        <>
          <Notice error>
            {error ||
              (!subscriptionId
                ? "No subscription was provided. Open billing to check your payment."
                : "")}
          </Notice>
          {data && (
            <p>
              Subscription status: <Badge>{data.subscription.status}</Badge>
            </p>
          )}
          <div className="actions" style={{ justifyContent: "center" }}>
            <button className="button secondary" onClick={reload}>
              Check again
            </button>
            <Link
              className="button"
              href={active ? "/dashboard/events/new" : "/dashboard/billing"}
            >
              {active ? "Create your event" : "Go to billing"}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
