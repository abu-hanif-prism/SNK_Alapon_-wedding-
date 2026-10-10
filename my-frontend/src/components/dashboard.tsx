"use client";
import Link from "next/link";
import { useData } from "./data";
import { Heading, Notice, Loading, Empty, Badge, Action } from "./ui";
import { formatDate, bytes, type Event, type Subscription } from "@/lib/types";
import { useSession } from "./session";
import { request, errorMessage } from "@/lib/api";
import { useState } from "react";
export function Dashboard() {
  const { user } = useSession();
  const events = useData<{ events: Event[] }>("/events");
  const subs = useData<{ subscriptions: Subscription[] }>("/subscriptions");
  return (
    <>
      <Heading
        eyebrow="Your wedding workspace"
        title={"Welcome, " + (user?.name.split(" ")[0] || "you")}
        action={
          <Link className="button" href="/dashboard/events/new">
            + Create an event
          </Link>
        }
      >
        A little space for your most meaningful moments.
      </Heading>
      <Notice error>{events.error || subs.error}</Notice>
      {events.loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid-3 metrics" style={{ marginBottom: 32 }}>
            <div className="metric">
              <p>Your events</p>
              <strong>{events.data?.events.length || 0}</strong>
              <small>Stories worth keeping</small>
            </div>
            <div className="metric">
              <p>Memories collected</p>
              <strong>
                {events.data?.events.reduce((n, e) => n + e.photoCount, 0) || 0}
              </strong>
              <small>From your favourite people</small>
            </div>
            <div className="metric">
              <p>Storage used</p>
              <strong>
                {bytes(
                  subs.data?.subscriptions.reduce(
                    (n, s) => n + Number(s.usedBytes),
                    0,
                  ) || 0,
                )}
              </strong>
              <Link className="text-button" href="/dashboard/billing">
                Manage your plan →
              </Link>
            </div>
          </div>
          <h2>Your celebrations</h2>
          {events.data?.events.length === 0 ? (
            <Empty title="Every story starts with a moment">
              <p>
                Create your event, invite your people, and let the memories find
                their way here.
              </p>
              <Link className="button" href="/dashboard/events/new">
                Create your first event
              </Link>
            </Empty>
          ) : (
            <div className="grid-2">
              {events.data?.events.map((e) => (
                <Link
                  className="panel event-card"
                  key={e.id}
                  href={"/dashboard/events/" + e.id}
                >
                  <div className="card-image">{e.coupleNames}</div>
                  <div className="card-body">
                    <Badge>{e.status}</Badge>
                    <h2 style={{ marginTop: 15 }}>{e.title}</h2>
                    <p>
                      {formatDate(e.eventDate)} · {e.location}
                    </p>
                    <div className="actions">
                      <small>{e.photoCount} memories collected</small>
                      <span className="text-button">Open your space →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
export function Account() {
  const { user } = useSession();
  const [message, setMessage] = useState("");
  return (
    <>
      <Heading title="Your account">
        The details behind your wedding space.
      </Heading>
      <div className="panel form">
        <p>
          <strong>{user?.name}</strong>
          <br />
          {user?.email}
        </p>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await request("/auth/phone", "PATCH", {
                phone: new FormData(e.currentTarget).get("phone"),
              });
              setMessage("Mobile updated. Please verify your new number.");
            } catch (e) {
              setMessage(errorMessage(e));
            }
          }}
        >
          <label>
            Mobile number
            <input
              name="phone"
              type="tel"
              required
              defaultValue={user?.phone}
            />
          </label>
          <button className="button">Update mobile</button>
        </form>
        <Notice>{message}</Notice>
        <Link className="text-button" href="/verify">
          Verify mobile number →
        </Link>
        <Action
          className="button secondary"
          onClick={async () => {
            await request("/auth/phone/send-code", "POST");
            setMessage("Verification code sent.");
          }}
        >
          Send verification code
        </Action>
      </div>
    </>
  );
}
