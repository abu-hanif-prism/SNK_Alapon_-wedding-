"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request, errorMessage } from "@/lib/api";
import { type Subscription, type Template } from "@/lib/types";
import { useData } from "./data";
import { Heading, Loading, Notice } from "./ui";
import { styles } from "./templates";
export function CreateEvent() {
  const subscriptions = useData<{ subscriptions: Subscription[] }>(
    "/subscriptions",
  );
  const templates = useData<{ templates: Template[] }>("/templates");
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    brideName: "",
    groomName: "",
    location: "Dhaka",
    venue: "",
    eventDate: "",
    slug: "",
    subscriptionId: "",
    templateVersionId: "",
    approvalRequired: true,
    allowViewerDownload: false,
    requireGuestName: false,
    allowGuestNotes: true,
    perGuestUploadLimit: 20,
    accessPin: "",
    introQuote: "",
    closingText: "",
  });
  const router = useRouter();
  const active =
    subscriptions.data?.subscriptions.filter((s) => s.status === "ACTIVE") ||
    [];
  const selected = active.find((s) => s.id === draft.subscriptionId);
  function field(key: string, value: string | number | boolean) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (step < 3) {
      if (step === 0) {
        if (!draft.subscriptionId) {
          setError("Choose an active subscription first.");
          return;
        }
        if (draft.slug) {
          try {
            const d = await request<{ available: boolean }>(
              "/events/slug-check?slug=" + encodeURIComponent(draft.slug),
            );
            if (!d.available) {
              setError("That website address is already taken. Try another.");
              return;
            }
          } catch (e) {
            setError(errorMessage(e));
            return;
          }
        }
      }
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const { introQuote, closingText, ...fields } = draft;
      const d = await request<{ event: { id: string } }>("/events", "POST", {
        ...fields,
        slug: fields.slug || undefined,
        accessPin: fields.accessPin || null,
        content: { introQuote, closingText },
        timezone: "Asia/Dhaka",
      });
      router.push("/dashboard/events/" + d.event.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (subscriptions.loading || templates.loading) return <Loading />;
  return (
    <>
      <Heading
        eyebrow={"Step " + (step + 1) + " of 4"}
        title={
          [
            "Tell us about your day",
            "Select your editorial style",
            "Make it yours",
            "One last look",
          ][step]
        }
      >
        Your story begins with the little details.
      </Heading>
      <Notice error>{error || subscriptions.error || templates.error}</Notice>
      {active.length === 0 ? (
        <div className="panel">
          <h2>A home for your next chapter</h2>
          <p>You need an active subscription before creating an event.</p>
          <Link className="button" href="/dashboard/billing">
            Choose a plan
          </Link>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          {step === 0 && (
            <div className="panel form">
              <div className="grid-2">
                <label>
                  Bride’s name
                  <input
                    value={draft.brideName}
                    onChange={(e) => field("brideName", e.target.value)}
                    required
                    maxLength={60}
                  />
                </label>
                <label>
                  Groom’s name
                  <input
                    value={draft.groomName}
                    onChange={(e) => field("groomName", e.target.value)}
                    required
                    maxLength={60}
                  />
                </label>
              </div>
              <label>
                Wedding date
                <input
                  type="date"
                  value={draft.eventDate}
                  onChange={(e) => field("eventDate", e.target.value)}
                  required
                />
              </label>
              <div className="grid-2">
                <label>
                  City / region
                  <input
                    value={draft.location}
                    onChange={(e) => field("location", e.target.value)}
                    required
                  />
                </label>
                <label>
                  Venue (optional)
                  <input
                    value={draft.venue}
                    onChange={(e) => field("venue", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Website address
                <input
                  placeholder="amira-and-rayhan"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  minLength={3}
                  maxLength={60}
                  value={draft.slug}
                  onChange={(e) => field("slug", e.target.value.toLowerCase())}
                />
                <small>
                  Leave blank for an automatically generated address.
                </small>
              </label>
              <label>
                Subscription
                <select
                  required
                  aria-label="Subscription"
                  value={draft.subscriptionId}
                  onChange={(e) => {
                    field("subscriptionId", e.target.value);
                    field("templateVersionId", "");
                  }}
                >
                  <option value="">Choose an active plan</option>
                  {active.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.plan?.name} · {s.edition} photographs · {s.maxEvents}{" "}
                      events
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {step === 1 && (
            <div className="grid-2">
              {templates.data?.templates.map((t, i) => {
                const version = t.versions.find(
                  (v) => v.edition === selected?.edition,
                );
                if (!version) return null;
                return (
                  <label
                    className={
                      "panel template-card " +
                      (draft.templateVersionId === version.id ? "selected" : "")
                    }
                    key={t.id}
                  >
                    <img
                      src={
                        (
                          styles.find((s) => t.code.includes(s.code)) ||
                          styles[i % styles.length]
                        ).image
                      }
                      alt={t.name}
                    />
                    <h2>{t.name}</h2>
                    <span className="check">
                      <input
                        type="radio"
                        name="template"
                        required
                        checked={draft.templateVersionId === version.id}
                        onChange={() => field("templateVersionId", version.id)}
                      />{" "}
                      Use this style
                    </span>
                    <Link
                      className="text-button"
                      target="_blank"
                      href={
                        "/preview/" +
                        (t.code.includes("premiere")
                          ? "premiere"
                          : t.code.includes("keepsake")
                            ? "keepsake"
                            : "minimal")
                      }
                    >
                      Explore preview ↗
                    </Link>
                  </label>
                );
              })}
            </div>
          )}
          {step === 2 && (
            <div className="panel form">
              <label>
                Opening quote
                <textarea
                  maxLength={300}
                  value={draft.introQuote}
                  onChange={(e) => field("introQuote", e.target.value)}
                  placeholder="A little glimpse of our favourite day…"
                />
              </label>
              <label>
                Closing message
                <textarea
                  maxLength={600}
                  value={draft.closingText}
                  onChange={(e) => field("closingText", e.target.value)}
                />
              </label>
              <label>
                Photos per guest
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={draft.perGuestUploadLimit}
                  onChange={(e) =>
                    field("perGuestUploadLimit", Number(e.target.value))
                  }
                />
              </label>
              {(
                [
                  "approvalRequired",
                  "allowViewerDownload",
                  "requireGuestName",
                  "allowGuestNotes",
                ] as const
              ).map((k, i) => (
                <label key={k} className="check">
                  <input
                    type="checkbox"
                    checked={draft[k]}
                    onChange={(e) => field(k, e.target.checked)}
                  />
                  {
                    [
                      "Approve photos before they appear",
                      "Allow viewers to download photos",
                      "Ask every guest for their name",
                      "Let guests leave a message",
                    ][i]
                  }
                </label>
              ))}
              <label>
                Private access PIN (optional)
                <input
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={draft.accessPin}
                  onChange={(e) => field("accessPin", e.target.value)}
                  placeholder="Four digits"
                />
              </label>
            </div>
          )}
          {step === 3 && (
            <div className="panel">
              <h2>
                {draft.brideName} & {draft.groomName}
              </h2>
              <p>
                {draft.eventDate} · {draft.location} · {draft.venue}
              </p>
              <hr className="divider" />
              <p>
                {selected?.edition} photo edition · {draft.perGuestUploadLimit}{" "}
                uploads per guest
              </p>
              <p>
                {draft.approvalRequired
                  ? "Host approval enabled"
                  : "Automatic approval"}{" "}
                · {draft.accessPin ? "PIN protected" : "Link access"}
              </p>
              <p>
                Your event will be saved as a draft. Add photographs and publish
                when you’re ready.
              </p>
            </div>
          )}
          <div className="form-footer">
            {step > 0 ? (
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            ) : (
              <Link href="/dashboard" className="button secondary">
                Back to events
              </Link>
            )}
            <button
              className="button"
              disabled={busy || (step === 1 && !draft.templateVersionId)}
            >
              {busy
                ? "Creating your space…"
                : step === 3
                  ? "Create wedding space"
                  : "Continue →"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
