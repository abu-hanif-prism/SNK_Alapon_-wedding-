"use client";
import { useState } from "react";
import { useData } from "./data";
import { useApprovedPhotos } from "./approved-photos";
import { Action, Notice, Loading } from "./ui";
import { request } from "@/lib/api";
import type { Event } from "@/lib/types";
type Chapter = { title: string; photoIds: string[] };
export function Curation({ event }: { event: Event }) {
  const base = "/events/" + event.id + "/gallery";
  const current = useData<{
    chapters: { title: string; photos: { id: string }[] }[];
  }>(base + "/curation");
  const photos = useApprovedPhotos(event.id);
  const [chapters, setChapters] = useState<Chapter[]>([]),
    [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(current.data);
  if (current.data !== loaded) {
    setLoaded(current.data);
    if (current.data)
      setChapters(
        current.data.chapters.map((c) => ({
          title: c.title,
          photoIds: c.photos.map((p) => p.id),
        })),
      );
  }
  const count = chapters.reduce((n, c) => n + c.photoIds.length, 0);
  function change(i: number, c: Chapter) {
    setChapters((old) => old.map((v, n) => (n === i ? c : v)));
  }
  function move(i: number, direction: number) {
    setChapters((old) => {
      const next = [...old];
      [next[i], next[i + direction]] = [next[i + direction], next[i]];
      return next;
    });
  }
  if (current.loading) return <Loading />;
  return (
    <>
      <Notice error>{current.error || photos.error}</Notice>
      <div className="toolbar">
        <div>
          <strong>Arrange your story</strong>
          <p style={{ margin: 0 }}>
            {count} / {event.edition} photographs selected
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            setChapters((c) => [...c, { title: "A new chapter", photoIds: [] }])
          }
        >
          + Add chapter
        </button>
      </div>
      <p>
        Create chapters and order the photographs. Layouts are arranged
        automatically for your edition.
      </p>
      <div className="stack">
        {chapters.map((c, i) => (
          <section className="panel chapter" key={i}>
            <div className="actions">
              <label style={{ flex: 1 }}>
                Chapter title
                <input
                  value={c.title}
                  maxLength={120}
                  onChange={(e) => change(i, { ...c, title: e.target.value })}
                />
              </label>
              <button
                aria-label="Move chapter up"
                className="button secondary"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                aria-label="Move chapter down"
                className="button secondary"
                disabled={i === chapters.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button
                className="text-button"
                onClick={() =>
                  setChapters((old) => old.filter((_, n) => n !== i))
                }
              >
                Remove chapter
              </button>
            </div>
            <div className="chapter-list">
              {c.photoIds.map((id, j) => {
                const p = photos.data?.items.find((p) => p.id === id);
                return (
                  <div className="chapter-item" key={id}>
                    <span>
                      {j + 1}.{" "}
                      {p?.caption ||
                        p?.originalFilename ||
                        "Selected photograph"}
                    </span>
                    <div className="actions">
                      <button
                        aria-label="Move photo up"
                        disabled={j === 0}
                        onClick={() => {
                          const ids = [...c.photoIds];
                          [ids[j], ids[j - 1]] = [ids[j - 1], ids[j]];
                          change(i, { ...c, photoIds: ids });
                        }}
                      >
                        ↑
                      </button>
                      <button
                        aria-label="Move photo down"
                        disabled={j === c.photoIds.length - 1}
                        onClick={() => {
                          const ids = [...c.photoIds];
                          [ids[j], ids[j + 1]] = [ids[j + 1], ids[j]];
                          change(i, { ...c, photoIds: ids });
                        }}
                      >
                        ↓
                      </button>
                      <button
                        aria-label="Remove photo"
                        onClick={() =>
                          change(i, {
                            ...c,
                            photoIds: c.photoIds.filter((x) => x !== id),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <label>
              Add an approved photograph
              <select
                value=""
                disabled={count >= event.edition}
                onChange={(e) => {
                  if (e.target.value)
                    change(i, {
                      ...c,
                      photoIds: [...c.photoIds, e.target.value],
                    });
                }}
              >
                <option value="">Choose a photograph</option>
                {photos.data?.items
                  .filter(
                    (p) => !chapters.some((c) => c.photoIds.includes(p.id)),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.caption || p.originalFilename}
                    </option>
                  ))}
              </select>
            </label>
          </section>
        ))}
      </div>
      <Notice>{message}</Notice>
      <div className="actions" style={{ marginTop: 24 }}>
        <Action
          disabled={
            count > event.edition || chapters.some((c) => !c.title.trim())
          }
          onClick={async () => {
            await request(base + "/curation", "PUT", { chapters });
            setMessage("Your gallery layout has been saved.");
          }}
        >
          Save gallery layout
        </Action>
        <Action
          className="button secondary"
          onClick={async () => {
            if (
              !window.confirm(
                "Replace your current layout with an automatic selection?",
              )
            )
              return;
            await request(base + "/autofill", "POST");
            current.reload();
            setMessage("Gallery arranged automatically.");
          }}
        >
          Auto-arrange gallery
        </Action>
      </div>
    </>
  );
}
