"use client";
import Link from "next/link";
import { useState } from "react";
import { useData } from "./data";
import { Heading, Loading, Notice, Action, Pager, Badge, Empty } from "./ui";
import { request, errorMessage } from "@/lib/api";
import { Photos } from "./event-workspace";
type Row = Record<string, unknown> & { id: string };
const text = (v: unknown): string =>
  v === null || v === undefined
    ? "—"
    : typeof v === "object"
      ? ("name" in v && String(v.name)) ||
        ("email" in v && String(v.email)) ||
        ("title" in v && String(v.title)) ||
        JSON.stringify(v)
      : String(v);
const titles: Record<string, string> = {
  users: "Hosts",
  events: "Events & moderation",
  plans: "Plans",
  templates: "Templates",
  "block-types": "Layout blocks",
  subscriptions: "Subscriptions",
  payments: "Payments",
  "audit-logs": "Activity log",
};
const columns: Record<string, string[]> = {
  users: ["name", "email", "phone", "status"],
  events: ["title", "host", "status", "photoCount"],
  plans: ["name", "edition", "price", "maxEvents", "isActive"],
  templates: ["name", "code", "isActive"],
  "block-types": ["name", "code", "minPhotos", "maxPhotos"],
  subscriptions: ["host", "plan", "status", "endsAt"],
  payments: ["invoiceNumber", "amount", "status", "trxId"],
  "audit-logs": ["action", "entityType", "actor", "createdAt"],
};
export function AdminOverview() {
  const { data, error, loading } =
    useData<Record<string, unknown>>("/admin/stats");
  return (
    <>
      <Heading eyebrow="SNK administration" title="A view of every celebration">
        Manage the people, plans and memories that bring SNAPNKEEP to life.
      </Heading>
      <Notice error>{error}</Notice>
      {loading ? (
        <Loading />
      ) : (
        <div className="grid-3">
          {Object.entries(data || {})
            .filter(([, v]) => !Array.isArray(v))
            .map(([k, v]) => (
              <div className="metric" key={k}>
                <p>{k.replace(/([A-Z])/g, " $1")}</p>
                {v && typeof v === "object" ? (
                  Object.entries(v).map(([label, value]) => (
                    <div key={label} className="actions">
                      <small>{label.replace(/([A-Z])/g, " $1")}</small>
                      <strong style={{ fontSize: 22 }}>{text(value)}</strong>
                    </div>
                  ))
                ) : (
                  <strong>
                    {k === "storageUsedBytes"
                      ? (Number(v) / 1073741824).toFixed(1) + " GB"
                      : text(v)}
                  </strong>
                )}
              </div>
            ))}
        </div>
      )}
      <h2 style={{ marginTop: 45 }}>Your workspace</h2>
      <div className="grid-3">
        {Object.entries(titles).map(([key, title]) => (
          <Link className="panel" key={key} href={"/admin/" + key}>
            <h3>{title}</h3>
            <span className="text-button">Open workspace →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
export function AdminList({ resource }: { resource: string }) {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState<Row | null | undefined>(undefined),
    [version, setVersion] = useState<string | null>(null);
  const path = "/admin/" + resource;
  const list = useData<Record<string, unknown>>(
    path +
      "?page=" +
      page +
      "&limit=25" +
      (search ? "&q=" + encodeURIComponent(search) : "") +
      (resource === "users" ? "&role=HOST" : ""),
  );
  const collection =
    list.data?.items ||
    list.data?.[resource === "block-types" ? "blockTypes" : resource];
  const rows = Array.isArray(collection) ? (collection as Row[]) : [];
  const editable = ["plans", "templates", "block-types"].includes(resource);
  return (
    <>
      <Heading
        eyebrow="SNK administration"
        title={titles[resource] || "Workspace"}
        action={
          editable ? (
            <button className="button" onClick={() => setEdit(null)}>
              + Create{" "}
              {resource === "block-types" ? "block" : resource.slice(0, -1)}
            </button>
          ) : undefined
        }
      >
        Keep your platform thoughtfully organized.
      </Heading>
      <Notice error>{list.error}</Notice>
      {["users", "events"].includes(resource) && (
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query);
            setPage(1);
          }}
        >
          <input
            aria-label="Search records"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="button secondary">Search</button>
        </form>
      )}
      {edit !== undefined && (
        <ResourceForm
          resource={resource}
          row={edit}
          close={() => setEdit(undefined)}
          done={() => {
            setEdit(undefined);
            list.reload();
          }}
        />
      )}
      {version && (
        <VersionForm
          id={version}
          done={() => {
            setVersion(null);
            list.reload();
          }}
        />
      )}
      {list.loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty title="Nothing here yet">
          <p>New records will appear here when they are created.</p>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {(columns[resource] || []).map((c) => (
                  <th key={c}>{c.replace(/([A-Z])/g, " $1")}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {(columns[resource] || []).map((c) => (
                    <td key={c}>
                      {c === "status" ? (
                        <Badge>{text(row[c])}</Badge>
                      ) : (
                        text(row[c])
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="actions">
                      {editable && (
                        <button
                          className="text-button"
                          onClick={() => setEdit(row)}
                        >
                          Edit
                        </button>
                      )}
                      {resource === "templates" && (
                        <button
                          className="text-button"
                          onClick={() => setVersion(row.id)}
                        >
                          Add version
                        </button>
                      )}
                      {resource === "users" && (
                        <Action
                          className="text-button"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "Change this host’s access status?",
                              )
                            )
                              return;
                            await request(path + "/" + row.id, "PATCH", {
                              status:
                                row.status === "ACTIVE"
                                  ? "SUSPENDED"
                                  : "ACTIVE",
                            });
                            list.reload();
                          }}
                        >
                          {row.status === "ACTIVE" ? "Suspend" : "Restore"}
                        </Action>
                      )}
                      {resource === "events" && (
                        <>
                          <Link
                            className="text-button"
                            href={"/admin/events/" + row.id}
                          >
                            Moderate photos
                          </Link>
                          <Action
                            className="text-button"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "Change the visibility of this event?",
                                )
                              )
                                return;
                              await request(
                                path + "/" + row.id + "/status",
                                "PATCH",
                                {
                                  status:
                                    row.status === "PUBLISHED"
                                      ? "DRAFT"
                                      : "PUBLISHED",
                                },
                              );
                              list.reload();
                            }}
                          >
                            {row.status === "PUBLISHED" ? "Hide" : "Publish"}
                          </Action>
                          <Action
                            className="text-button"
                            onClick={async () => {
                              if (!window.confirm("Archive this event?"))
                                return;
                              await request(
                                path + "/" + row.id + "/status",
                                "PATCH",
                                { status: "ARCHIVED" },
                              );
                              list.reload();
                            }}
                          >
                            Archive
                          </Action>
                        </>
                      )}
                      {resource === "subscriptions" && (
                        <>
                          {row.status === "PENDING_PAYMENT" && (
                            <Action
                              className="text-button"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "Activate this subscription after verifying payment?",
                                  )
                                )
                                  return;
                                await request(
                                  path + "/" + row.id + "/action",
                                  "POST",
                                  { action: "activate" },
                                );
                                list.reload();
                              }}
                            >
                              Activate
                            </Action>
                          )}
                          <Action
                            className="text-button"
                            onClick={async () => {
                              const months = window.prompt(
                                "How many months should be added?",
                                "1",
                              );
                              if (months === null) return;
                              if (
                                !Number.isInteger(Number(months)) ||
                                Number(months) < 1 ||
                                Number(months) > 60
                              )
                                throw new Error(
                                  "Enter a whole number from 1 to 60.",
                                );
                              await request(
                                path + "/" + row.id + "/action",
                                "POST",
                                { action: "extend", months: Number(months) },
                              );
                              list.reload();
                            }}
                          >
                            Extend
                          </Action>
                          <Action
                            className="text-button"
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "Cancel this subscription and archive its events?",
                                )
                              )
                                return;
                              await request(
                                path + "/" + row.id + "/action",
                                "POST",
                                { action: "cancel" },
                              );
                              list.reload();
                            }}
                          >
                            Cancel
                          </Action>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {typeof list.data?.total === "number" && (
        <Pager
          page={page}
          total={list.data.total}
          limit={25}
          setPage={setPage}
        />
      )}
    </>
  );
}
function ResourceForm({
  resource,
  row,
  close,
  done,
}: {
  resource: string;
  row: Row | null;
  close: () => void;
  done: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const plan = resource === "plans",
    block = resource === "block-types";
  return (
    <form
      className="panel form"
      style={{ marginBottom: 30 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const body: Record<string, unknown> = { name: f.get("name") };
          if (!row) body.code = f.get("code");
          if (!block) body.isActive = f.has("isActive");
          if (plan)
            Object.assign(body, {
              edition: Number(f.get("edition")),
              maxEvents: Number(f.get("maxEvents")),
              storageLimitBytes: String(f.get("storageLimitBytes")),
              price: String(f.get("price")),
              currency: "BDT",
              billingPeriod: f.get("billingPeriod"),
              durationMonths: f.get("durationMonths")
                ? Number(f.get("durationMonths"))
                : null,
            });
          if (block)
            Object.assign(body, {
              minPhotos: Number(f.get("minPhotos")),
              maxPhotos: Number(f.get("maxPhotos")),
              responsiveConfig: JSON.parse(
                String(f.get("responsiveConfig") || "{}"),
              ),
            });
          await request(
            "/admin/" + resource + (row ? "/" + row.id : ""),
            row ? "PATCH" : "POST",
            body,
          );
          done();
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>
        {row ? "Edit" : "Create"}{" "}
        {plan ? "plan" : block ? "layout block" : "template"}
      </h2>
      <div className="grid-2">
        <label>
          Name
          <input
            name="name"
            defaultValue={row ? text(row.name) : ""}
            required
            maxLength={100}
          />
        </label>
        {!row && (
          <label>
            Unique code
            <input
              name="code"
              pattern="[a-z0-9][a-z0-9-]{1,40}"
              required
              placeholder="signature-40"
            />
          </label>
        )}
        {plan && (
          <>
            {[
              "edition",
              "maxEvents",
              "storageLimitBytes",
              "price",
              "durationMonths",
            ].map((key, i) => (
              <label key={key}>
                {
                  [
                    "Photo edition",
                    "Maximum events",
                    "Storage limit (bytes)",
                    "Price (BDT)",
                    "Duration (months, optional)",
                  ][i]
                }
                <input
                  name={key}
                  type="number"
                  min={key === "price" ? 0 : 1}
                  step={key === "price" ? ".01" : "1"}
                  required={key !== "durationMonths"}
                  defaultValue={
                    row && row[key] != null
                      ? String(row[key])
                      : ["40", "1", "5368709120", "1499", "2"][i]
                  }
                />
              </label>
            ))}
            <label>
              Billing period
              <select
                name="billingPeriod"
                defaultValue={row ? String(row.billingPeriod) : "ONE_TIME"}
              >
                <option>ONE_TIME</option>
                <option>MONTHLY</option>
                <option>YEARLY</option>
              </select>
            </label>
          </>
        )}
        {block && (
          <>
            {["minPhotos", "maxPhotos"].map((k) => (
              <label key={k}>
                {k === "minPhotos" ? "Minimum photos" : "Maximum photos"}
                <input
                  name={k}
                  type="number"
                  min={1}
                  max={6}
                  required
                  defaultValue={row ? String(row[k]) : 1}
                />
              </label>
            ))}
          </>
        )}
      </div>
      {block && (
        <label>
          Responsive configuration (JSON)
          <textarea
            name="responsiveConfig"
            defaultValue={JSON.stringify(row?.responsiveConfig || {}, null, 2)}
            required
          />
        </label>
      )}
      {!block && (
        <label className="check">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={row ? Boolean(row.isActive) : true}
          />
          Active and available
        </label>
      )}
      <Notice error>{error}</Notice>
      <div className="actions">
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="button secondary" onClick={close}>
          Cancel
        </button>
      </div>
    </form>
  );
}
function VersionForm({ id, done }: { id: string; done: () => void }) {
  const [error, setError] = useState("");
  return (
    <form
      className="panel form"
      style={{ marginBottom: 24 }}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          await request("/admin/templates/" + id + "/versions", "POST", {
            version: f.get("version"),
            edition: Number(f.get("edition")),
            layoutDefinition: JSON.parse(String(f.get("layout"))),
            themeDefaults: JSON.parse(String(f.get("theme"))),
          });
          done();
        } catch (e) {
          setError(errorMessage(e));
        }
      }}
    >
      <h2>Publish a template version</h2>
      <p>
        Versions are immutable. Existing events keep their selected version.
      </p>
      <label>
        Version
        <input name="version" required placeholder="1.1" />
      </label>
      <label>
        Edition
        <input
          name="edition"
          type="number"
          min={1}
          required
          defaultValue={40}
        />
      </label>
      <label>
        Layout definition (JSON)
        <textarea name="layout" required defaultValue={'{"sections":[]}'} />
      </label>
      <label>
        Theme defaults (JSON)
        <textarea name="theme" required defaultValue={"{}"} />
      </label>
      <Notice error>{error}</Notice>
      <div className="actions">
        <button className="button">Publish version</button>
        <button type="button" className="button secondary" onClick={done}>
          Cancel
        </button>
      </div>
    </form>
  );
}
export function AdminModeration({ id }: { id: string }) {
  return (
    <>
      <Heading
        title="Review event memories"
        action={
          <Link href="/admin/events" className="button secondary">
            Back to events
          </Link>
        }
      >
        Approve or remove photographs from this celebration.
      </Heading>
      <Photos id={id} admin />
    </>
  );
}
