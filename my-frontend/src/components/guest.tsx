"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { request, errorMessage } from "@/lib/api";
import {
  fileInfo,
  putFiles,
  validateFiles,
  sanitizeFilename,
  type UploadTarget,
} from "@/lib/uploads";
import { Notice, Loading } from "./ui";
type GuestSession = {
  state: string;
  pinRequired: boolean;
  event: { coupleNames: string; slug: string; welcomeMessage: string | null };
  settings: {
    requireGuestName: boolean;
    allowGuestNotes: boolean;
    approvalRequired: boolean;
    perGuestUploadLimit: number;
  } | null;
  guest: { remainingUploads: number; displayName: string | null } | null;
  eventRemainingUploads: number | null;
  window: { opensAt: string; closesAt: string };
};
export function GuestUpload({ token }: { token: string }) {
  const base = "/u/" + encodeURIComponent(token);
  const [session, setSession] = useState<GuestSession | null>(null),
    [error, setError] = useState(""),
    [step, setStep] = useState(0),
    [files, setFiles] = useState<File[]>([]),
    [name, setName] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [success, setSuccess] = useState(false);
  const key = useRef<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  // Object URLs are browser resources: allocate on mount and revoke on file changes.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // Browser object URLs must be created and released with this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);
  useEffect(() => {
    let live = true;
    request<GuestSession>(base + "/session", "POST", undefined, false)
      .then((d) => {
        if (live) {
          setSession(d);
          setName(d.guest?.displayName || "");
        }
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      });
    return () => {
      live = false;
    };
  }, [base]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (files.length && !success) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [files.length, success]);
  const remaining = Math.min(
    session?.guest?.remainingUploads ?? 0,
    session?.eventRemainingUploads ?? Infinity,
  );
  function choose(add: File[]) {
    try {
      const next = [...files, ...add];
      validateFiles(next, remaining);
      if (
        new Set(next.map((f) => sanitizeFilename(f.name))).size !== next.length
      )
        throw new Error(
          "Please choose photos with different filenames in each batch.",
        );
      setFiles(next);
      key.current = null;
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function upload() {
    setBusy(true);
    setError("");
    try {
      if (name.trim() || session?.settings?.requireGuestName)
        await request(
          base + "/guest",
          "PATCH",
          { displayName: name.trim() || null },
          false,
        );
      validateFiles(files, remaining);
      if (!key.current) key.current = crypto.randomUUID();
      const d = await request<{
        batch: { id: string; status: string };
        uploads?: UploadTarget[];
      }>(
        base + "/batches",
        "POST",
        {
          idempotencyKey: key.current,
          message: note.trim() || undefined,
          files: files.map(fileInfo),
        },
        false,
      );
      if (d.batch.status !== "COMPLETED") {
        await putFiles(files, d.uploads || [], setProgress);
        const done = await request<{
          missing: { photoId: string; filename: string }[];
        }>(
          base + "/batches/" + d.batch.id + "/complete",
          "POST",
          undefined,
          false,
        );
        if (done.missing.length) {
          setFiles(
            files.filter((f) =>
              done.missing.some((m) => m.filename === sanitizeFilename(f.name)),
            ),
          );
          key.current = null;
          setSession(
            await request<GuestSession>(
              base + "/session",
              "POST",
              undefined,
              false,
            ),
          );
          throw new Error(
            done.missing.length +
              " photos could not be verified. The remaining photos were received. Retry the photos still selected.",
          );
        }
      }
      setSuccess(true);
      setFiles([]);
      setSession(
        await request<GuestSession>(
          base + "/session",
          "POST",
          undefined,
          false,
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="guest-page">
      <div className="guest-content">
        <Link href="/" className="eyebrow">
          SNAPNKEEP · THE WEDDING TIME
        </Link>
        <div style={{ marginTop: 36 }} />
        <Notice error>{error}</Notice>
        {!session ? (
          error ? (
            <button className="button" onClick={() => location.reload()}>
              Try again
            </button>
          ) : (
            <Loading />
          )
        ) : success ? (
          <>
            <h1>Thank you for being part of our story.</h1>
            <p>
              Your photos have arrived.
              {session.settings?.approvalRequired
                ? " The couple will review them before they appear in the gallery."
                : " They are being prepared for the couple."}
            </p>
            <Link className="button" href={"/w/" + session.event.slug}>
              View their wedding
            </Link>
            {remaining > 0 && (
              <button
                className="text-button"
                onClick={() => {
                  setSuccess(false);
                  setStep(0);
                  setNote("");
                  key.current = null;
                }}
              >
                Share more memories
              </button>
            )}
          </>
        ) : session.pinRequired ? (
          <>
            <div className="eyebrow">A private celebration</div>
            <h1>Enter the wedding PIN</h1>
            <p>
              Use the four-digit code shared by {session.event.coupleNames}.
            </p>
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await request(
                    base + "/unlock",
                    "POST",
                    { pin: new FormData(e.currentTarget).get("pin") },
                    false,
                  );
                  setSession(
                    await request<GuestSession>(
                      base + "/session",
                      "POST",
                      undefined,
                      false,
                    ),
                  );
                  setError("");
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Wedding PIN
                <input
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  required
                />
              </label>
              <button className="button" disabled={busy}>
                Enter wedding
              </button>
            </form>
          </>
        ) : session.state !== "open" ? (
          <>
            <h1>
              {session.state === "not_open_yet"
                ? "A little early for the celebration"
                : "The photo collection has closed"}
            </h1>
            <p>
              {session.state === "not_open_yet"
                ? "Come back from " +
                  new Date(session.window.opensAt).toLocaleString() +
                  "."
                : "Thank you for helping keep these memories alive."}
            </p>
            <Link className="button" href={"/w/" + session.event.slug}>
              View wedding gallery
            </Link>
          </>
        ) : remaining <= 0 ? (
          <>
            <h1>You’ve shared so much love.</h1>
            <p>
              The upload allowance has been reached. Thank you for your
              memories.
            </p>
            <Link className="button" href={"/w/" + session.event.slug}>
              View the wedding
            </Link>
          </>
        ) : (
          <>
            <div className="eyebrow">{session.event.coupleNames}</div>
            <h1>
              {
                [
                  "Help us remember the day through your eyes.",
                  "Review your memories",
                  "Ready to send your photos?",
                ][step]
              }
            </h1>
            <p>
              {session.event.welcomeMessage ||
                "The passing moments. The happy tears. The dance-floor legends. We would love to see your side of our day."}
            </p>
            <p>
              <small>{remaining} uploads remaining · No account needed</small>
            </p>
            {step === 0 ? (
              <div className="form">
                <label>
                  Your name{" "}
                  {session.settings?.requireGuestName ? "" : "(optional)"}
                  <input
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="upload-tile">
                  Choose your candid photos
                  <input
                    aria-label="Select photographs"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      choose(Array.from(e.target.files || []));
                      e.target.value = "";
                    }}
                  />
                  <small>
                    JPG, PNG or WebP · 25 MB per photo · 20 per batch
                  </small>
                </label>
                <div className="photo-grid">
                  {previews.map((url, i) => (
                    <div className="upload-preview" key={url}>
                      <img src={url} alt={files[i].name} />
                      <button
                        aria-label={"Remove " + files[i].name}
                        onClick={() => {
                          setFiles((f) => f.filter((_, n) => n !== i));
                          key.current = null;
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="button"
                  disabled={
                    !files.length ||
                    (session.settings?.requireGuestName && !name.trim())
                  }
                  onClick={() => setStep(1)}
                >
                  Review {files.length} photos →
                </button>
              </div>
            ) : step === 1 ? (
              <div className="form">
                <div className="photo-grid">
                  {previews.map((url, i) => (
                    <img key={url} src={url} alt={files[i].name} />
                  ))}
                </div>
                {session.settings?.allowGuestNotes && (
                  <label>
                    A message for the couple
                    <textarea
                      maxLength={150}
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value);
                        key.current = null;
                      }}
                      placeholder="A little love to go with your photos…"
                    />
                    <small>{note.length} / 150</small>
                  </label>
                )}
                <button className="button" onClick={() => setStep(2)}>
                  Continue to final review
                </button>
                <button className="text-button" onClick={() => setStep(0)}>
                  Back to photos
                </button>
              </div>
            ) : (
              <div className="form">
                <div className="upload-tile">
                  <h2>{files.length} memories</h2>
                  <p>Shared by {name || "a wedding guest"}</p>
                  {note && <p>“{note}”</p>}
                </div>
                <p>
                  {session.settings?.approvalRequired
                    ? "Your photos will be privately reviewed by the couple."
                    : "Your photos will be processed and made available to the couple."}
                </p>
                {busy && (
                  <>
                    <progress max={100} value={progress} />
                    <p role="status">
                      Uploading… {progress}% — keep this page open.
                    </p>
                  </>
                )}
                <button className="button" disabled={busy} onClick={upload}>
                  {busy
                    ? "Sending memories…"
                    : error
                      ? "Retry sending photos"
                      : "Send photos now"}
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setStep(1)}
                >
                  Go back and edit
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
