"use client";
import Link from "next/link";
import { useState } from "react";
import { useData } from "./data";
import { Heading, Loading, Notice, Badge, Action, Empty, Pager } from "./ui";
import { request, errorMessage, copyText } from "@/lib/api";
import {
  formatDate,
  type Event,
  type Photo,
  type PageData,
  type Template,
} from "@/lib/types";
import { hostUpload } from "@/lib/uploads";
import { Curation } from "./curation";
import { BlockEditor } from "./block-editor";
export function EventWorkspace({
  id,
  tab = "photos",
}: {
  id: string;
  tab?: string;
}) {
  const event = useData<{ event: Event }>("/events/" + id);
  if (event.loading) return <Loading />;
  if (!event.data) return <Notice error>{event.error}</Notice>;
  const e = event.data.event;
  return (
    <>
      <Heading
        eyebrow={e.location + " · " + formatDate(e.eventDate)}
        title={e.coupleNames}
        action={
          <div className="actions">
            <Badge>{e.status}</Badge>
            {e.status !== "DRAFT" && (
              <Link
                className="button secondary"
                target="_blank"
                href={"/w/" + e.slug}
              >
                View website ↗
              </Link>
            )}
          </div>
        }
      >
        Your day, through the eyes of the people you love.
      </Heading>
      <nav className="tabs">
        {[
          ["photos", "Guest memories"],
          ["gallery", "Organize gallery"],
          ["layout", "Layout blocks"],
          ["share", "Invite & QR"],
          ["settings", "Settings"],
        ].map(([key, label]) => (
          <Link
            className={tab === key ? "active" : ""}
            key={key}
            href={"/dashboard/events/" + id + "/" + key}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "photos" ? (
        <Photos id={id} />
      ) : tab === "gallery" ? (
        <Curation event={e} />
      ) : tab === "layout" ? (
        <BlockEditor id={id} />
      ) : tab === "share" ? (
        <ShareEvent id={id} />
      ) : (
        <Settings event={e} reload={event.reload} />
      )}
      <div className="publish-bar">
        <p>
          {e.status === "PUBLISHED"
            ? "Your wedding website is live."
            : "Ready when you are. Publish to welcome your guests."}
        </p>
        <Action
          className="button purple"
          disabled={e.status === "ARCHIVED"}
          onClick={async () => {
            await request(
              "/events/" +
                id +
                (e.status === "PUBLISHED" ? "/unpublish" : "/publish"),
              "POST",
            );
            event.reload();
          }}
        >
          {e.status === "PUBLISHED" ? "Unpublish website" : "Publish website"}
        </Action>
      </div>
    </>
  );
}
export function Photos({ id, admin = false }: { id: string; admin?: boolean }) {
  const [page, setPage] = useState(1),
    [approval, setApproval] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const base = (admin ? "/admin" : "") + "/events/" + id + "/photos";
  const { data, error, loading, reload } = useData<PageData<Photo>>(
    base +
      "?page=" +
      page +
      "&limit=30" +
      (approval ? "&approval=" + approval : ""),
  );
  async function moderate(action: string) {
    await request(base + "/moderate", "POST", { photoIds: selected, action });
    setSelected([]);
    reload();
  }
  return (
    <>
      <div className="toolbar">
        <div className="actions">
          <strong>Curation mode</strong>
          <Badge>{selected.length} selected</Badge>
        </div>
        <label>
          Filter
          <select
            value={approval}
            onChange={(e) => {
              setApproval(e.target.value);
              setPage(1);
              setSelected([]);
            }}
          >
            <option value="">All uploads</option>
            <option>PENDING</option>
            <option>APPROVED</option>
            <option>REJECTED</option>
          </select>
        </label>
        <button
          className="text-button"
          onClick={() => setSelected(data?.items.map((p) => p.id) || [])}
        >
          Select page
        </button>
        <button className="text-button" onClick={reload}>
          Refresh
        </button>
      </div>
      <Notice error>{error}</Notice>
      <Notice>{message}</Notice>
      {!admin && (
        <label className="panel" style={{ marginBottom: 24 }}>
          Add your own photographs
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={async (e) => {
              const input = e.currentTarget;
              const files = Array.from(input.files || []);
              if (!files.length) return;
              setBusy(true);
              setMessage("");
              try {
                await hostUpload(id, files, setProgress);
                setMessage("Photos uploaded. Processing may take a moment.");
                reload();
                input.value = "";
              } catch (e) {
                setMessage(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          />
          <small>
            JPG, PNG or WebP · Up to 20 photos per batch · 25 MB each
          </small>
          {busy && <progress max={100} value={progress} />}
        </label>
      )}
      {selected.length > 0 && (
        <div className="actions" style={{ marginBottom: 20 }}>
          <Action onClick={() => moderate("APPROVE")}>Approve selected</Action>
          <Action
            className="button secondary"
            onClick={() => moderate("REJECT")}
          >
            Reject selected
          </Action>
          <Action
            className="button secondary"
            onClick={async () => {
              if (window.confirm("Move selected photos to deleted?"))
                await moderate("DELETE");
            }}
          >
            Delete selected
          </Action>
        </div>
      )}
      {loading ? (
        <Loading />
      ) : data?.items.length === 0 ? (
        <Empty title="The best moments are on their way">
          <p>Share your upload link or add photographs to begin.</p>
        </Empty>
      ) : (
        <div className="photo-list">
          {data?.items.map((p) => (
            <article
              className={
                "photo-row " + (selected.includes(p.id) ? "selected" : "")
              }
              key={p.id}
            >
              <input
                aria-label={"Select " + p.originalFilename}
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(ev) =>
                  setSelected((v) =>
                    ev.target.checked
                      ? [...v, p.id]
                      : v.filter((x) => x !== p.id),
                  )
                }
              />
              {p.thumbnailUrl ? (
                <img
                  src={p.thumbnailUrl}
                  alt={p.caption || p.originalFilename}
                />
              ) : (
                <span className="badge">{p.processingStatus}</span>
              )}
              <div className="photo-info">
                <h3>{p.guestName || "Your photograph"}</h3>
                <p>{p.originalFilename}</p>
                <Badge>
                  {p.approvalStatus} · {p.processingStatus}
                </Badge>
                {!admin && (
                  <label style={{ marginTop: 12 }}>
                    Caption
                    <input
                      defaultValue={p.caption || ""}
                      maxLength={300}
                      onBlur={async (e) => {
                        if (e.target.value === (p.caption || "")) return;
                        try {
                          await request(base + "/" + p.id, "PATCH", {
                            caption: e.target.value || null,
                          });
                          setMessage("Caption saved.");
                        } catch (e) {
                          setMessage(errorMessage(e));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              {!admin && (
                <div className="actions">
                  <Action
                    className="text-button"
                    onClick={async () => {
                      await request("/events/" + id + "/gallery/cover", "PUT", {
                        photoId: p.id,
                      });
                      setMessage("Cover photo updated.");
                    }}
                  >
                    Use as cover
                  </Action>
                  <Action
                    className="text-button"
                    onClick={async () => {
                      const d = await request<{ url: string }>(
                        base + "/" + p.id + "/download",
                      );
                      window.location.assign(d.url);
                    }}
                  >
                    Download original
                  </Action>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {data && (
        <Pager
          page={page}
          total={data.total}
          limit={30}
          setPage={(n) => {
            setPage(n);
            setSelected([]);
          }}
        />
      )}
    </>
  );
}
type Share = {
  websiteUrl: string;
  uploadUrl: string | null;
  qrCodeDataUrl: string | null;
  shareText: string | null;
  pin: string | null;
  link: { id: string; opensAt: string; closesAt: string; state: string } | null;
};
type UploadLink = {
  id: string;
  opensAt: string;
  closesAt: string;
  state: string;
};
export function ShareEvent({ id }: { id: string }) {
  const share = useData<Share>("/events/" + id + "/upload-links/share");
  const links = useData<{ links: UploadLink[] }>(
    "/events/" + id + "/upload-links",
  );
  const [message, setMessage] = useState("");
  return (
    <>
      <Notice error>{share.error || links.error}</Notice>
      {share.loading ? (
        <Loading />
      ) : (
        share.data && (
          <div className="grid-2">
            <div className="panel" style={{ textAlign: "center" }}>
              <div className="eyebrow">From their camera to your keepsake</div>
              <h2>Invite your favourite people</h2>
              {share.data.qrCodeDataUrl && (
                <img
                  className="qr"
                  src={share.data.qrCodeDataUrl}
                  alt="QR code for guest photo uploads"
                />
              )}
              <p>No app. No account. Just the moments.</p>
              <div className="actions" style={{ justifyContent: "center" }}>
                {share.data.uploadUrl && (
                  <Action
                    onClick={async () => {
                      await copyText(share.data!.uploadUrl!);
                      setMessage("Upload link copied.");
                    }}
                  >
                    Copy upload link
                  </Action>
                )}
                {share.data.qrCodeDataUrl && (
                  <a
                    className="button secondary"
                    download="wedding-upload-qr.png"
                    href={share.data.qrCodeDataUrl}
                  >
                    Download QR
                  </a>
                )}
              </div>
              {share.data.pin && (
                <p style={{ marginTop: 20 }}>
                  Guest PIN: <strong>{share.data.pin}</strong>
                </p>
              )}
            </div>
            <div className="panel form">
              <h2>Your sharing details</h2>
              <label>
                Public website
                <input value={share.data.websiteUrl} readOnly />
              </label>
              <Action
                className="button secondary"
                onClick={async () => {
                  await copyText(share.data!.websiteUrl);
                  setMessage("Website link copied.");
                }}
              >
                Copy website link
              </Action>
              <p>
                Upload links work only while the event is published, the
                subscription is active and the upload window is open.
              </p>
              <form
                className="form"
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  const f = new FormData(ev.currentTarget);
                  try {
                    await request("/events/" + id + "/upload-links", "POST", {
                      opensAt: new Date(String(f.get("opensAt"))).toISOString(),
                      closesAt: new Date(
                        String(f.get("closesAt")),
                      ).toISOString(),
                    });
                    share.reload();
                    links.reload();
                    setMessage("New upload link created.");
                  } catch (e) {
                    setMessage(errorMessage(e));
                  }
                }}
              >
                <label>
                  Opens at (your local time)
                  <input type="datetime-local" name="opensAt" required />
                </label>
                <label>
                  Closes at (your local time)
                  <input type="datetime-local" name="closesAt" required />
                </label>
                <button className="button">Create a new upload window</button>
              </form>
            </div>
          </div>
        )
      )}
      <Notice>{message}</Notice>
      <div className="stack" style={{ marginTop: 24 }}>
        {links.data?.links.map((l) => (
          <div key={l.id} className="panel">
            <div className="actions">
              <Badge>{l.state}</Badge>
              <span>
                {new Date(l.opensAt).toLocaleString()} —{" "}
                {new Date(l.closesAt).toLocaleString()}
              </span>
              <Action
                className="text-button"
                disabled={l.state === "revoked"}
                onClick={async () => {
                  if (!window.confirm("Revoke this guest upload link?")) return;
                  await request(
                    "/events/" + id + "/upload-links/" + l.id + "/revoke",
                    "POST",
                  );
                  links.reload();
                  share.reload();
                }}
              >
                Revoke link
              </Action>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function Settings({ event: e, reload }: { event: Event; reload: () => void }) {
  const templates = useData<{ templates: Template[] }>(
    "/templates?edition=" + e.edition,
  );
  const [message, setMessage] = useState("");
  return (
    <form
      className="panel form"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.currentTarget);
        try {
          await request("/events/" + e.id, "PATCH", {
            title: f.get("title"),
            coupleNames: f.get("coupleNames"),
            location: f.get("location"),
            eventDate: f.get("eventDate"),
            venue: f.get("venue"),
            perGuestUploadLimit: Number(f.get("perGuestUploadLimit")),
            eventUploadLimit: f.get("eventUploadLimit")
              ? Number(f.get("eventUploadLimit"))
              : null,
            approvalRequired: f.has("approvalRequired"),
            allowViewerDownload: f.has("allowViewerDownload"),
            requireGuestName: f.has("requireGuestName"),
            allowGuestNotes: f.has("allowGuestNotes"),
            accessPin: f.get("accessPin") || null,
            content: {
              ...e.content,
              introQuote: String(f.get("introQuote") || ""),
              closingText: String(f.get("closingText") || ""),
            },
            ...(e.status === "DRAFT"
              ? {
                  slug: f.get("slug"),
                  templateVersionId: f.get("templateVersionId"),
                }
              : {}),
          });
          setMessage("Your settings have been saved.");
          reload();
        } catch (e) {
          setMessage(errorMessage(e));
        }
      }}
    >
      <h2>The little details</h2>
      <div className="grid-2">
        <label>
          Event title
          <input name="title" required defaultValue={e.title} />
        </label>
        <label>
          Couple’s names
          <input name="coupleNames" required defaultValue={e.coupleNames} />
        </label>
        <label>
          Location
          <input name="location" required defaultValue={e.location} />
        </label>
        <label>
          Venue
          <input name="venue" defaultValue={e.venue || ""} />
        </label>
        <label>
          Wedding date
          <input
            type="date"
            name="eventDate"
            required
            defaultValue={e.eventDate.slice(0, 10)}
          />
        </label>
        {e.status === "DRAFT" && (
          <label>
            Website address
            <input
              name="slug"
              defaultValue={e.slug}
              minLength={3}
              maxLength={60}
              required
            />
          </label>
        )}
      </div>
      {e.status === "DRAFT" && (
        <label>
          Template
          <select name="templateVersionId" defaultValue={e.templateVersionId}>
            {templates.data?.templates.flatMap((t) =>
              t.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {t.name} · {v.edition} photos
                </option>
              )),
            )}
          </select>
        </label>
      )}
      <label>
        Opening quote
        <textarea
          name="introQuote"
          maxLength={300}
          defaultValue={e.content?.introQuote || ""}
        />
      </label>
      <label>
        Closing message
        <textarea
          name="closingText"
          maxLength={600}
          defaultValue={e.content?.closingText || ""}
        />
      </label>
      <h2>Guest access & privacy</h2>
      <div className="grid-2">
        <label>
          Photos per guest
          <input
            type="number"
            name="perGuestUploadLimit"
            min={1}
            max={500}
            required
            defaultValue={e.perGuestUploadLimit}
          />
        </label>
        <label>
          Event upload cap (optional)
          <input
            type="number"
            name="eventUploadLimit"
            min={1}
            defaultValue={e.eventUploadLimit || ""}
          />
        </label>
      </div>
      {(
        [
          "approvalRequired",
          "allowViewerDownload",
          "requireGuestName",
          "allowGuestNotes",
        ] as const
      ).map((k, i) => (
        <label key={k} className="check">
          <input type="checkbox" name={k} defaultChecked={e[k]} />
          {
            [
              "Require host approval",
              "Allow viewer downloads",
              "Require guest names",
              "Allow guest notes",
            ][i]
          }
        </label>
      ))}
      <label>
        Four-digit access PIN
        <input
          name="accessPin"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          defaultValue={e.accessPin || ""}
        />
        <small>Leave empty to allow access by link.</small>
      </label>
      <Notice>{message}</Notice>
      <button className="button" disabled={e.status === "ARCHIVED"}>
        Save changes
      </button>
    </form>
  );
}
