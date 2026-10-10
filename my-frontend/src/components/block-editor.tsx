"use client";
import { useState } from "react";
import { useData } from "./data";
import { useApprovedPhotos } from "./approved-photos";
import { Action, Notice, Loading } from "./ui";
import { request, errorMessage } from "@/lib/api";

type BlockType = {
  id: string;
  name: string;
  code: string;
  minPhotos: number;
  maxPhotos: number;
};
type Placement = {
  photo: { id: string; originalFilename: string };
  captionOverride: string | null;
};
type Block = {
  id: string;
  blockType: BlockType;
  complete: boolean;
  photos: Placement[];
};
type Section = {
  id: string;
  title: string;
  subtitle: string | null;
  blocks: Block[];
};
export function BlockEditor({ id }: { id: string }) {
  const base = "/events/" + id + "/gallery";
  const tree = useData<{ sections: Section[] }>(base);
  const types = useData<{ blockTypes: BlockType[] }>("/block-types");
  const photos = useApprovedPhotos(id);
  const [error, setError] = useState("");
  async function change(path: string, method: string, body?: unknown) {
    await request(base + path, method, body);
    tree.reload();
  }
  if (tree.loading) return <Loading />;
  return (
    <>
      <Notice error>
        {error || tree.error || types.error || photos.error}
      </Notice>
      <div className="toolbar">
        <div>
          <strong>Fine-tune the layout</strong>
          <p style={{ margin: 0 }}>
            Portrait pairs, full-bleed moments and little film strips.
          </p>
        </div>
        <Action
          className="button secondary"
          onClick={async () => {
            const title = window.prompt("Name your new chapter");
            if (title?.trim()) await change("/sections", "POST", { title });
          }}
        >
          + Add chapter
        </Action>
      </div>
      <p>
        Changes save directly. Incomplete blocks stay hidden from your published
        website.
      </p>
      <div className="stack">
        {tree.data?.sections.map((section, i) => (
          <section className="panel" key={section.id}>
            <div className="actions">
              <h2 style={{ flex: 1 }}>{section.title}</h2>
              <Action
                className="text-button"
                onClick={async () => {
                  const title = window.prompt("Chapter title", section.title);
                  if (title?.trim())
                    await change("/sections/" + section.id, "PATCH", { title });
                }}
              >
                Rename
              </Action>
              <Action
                className="text-button"
                disabled={i === 0}
                onClick={async () => {
                  const ids = tree.data!.sections.map((s) => s.id);
                  [ids[i], ids[i - 1]] = [ids[i - 1], ids[i]];
                  await change("/sections/reorder", "POST", { ids });
                }}
              >
                Move up
              </Action>
              <Action
                className="text-button"
                onClick={async () => {
                  if (
                    window.confirm(
                      "Remove this chapter and its layout blocks? Your uploaded photos are kept.",
                    )
                  )
                    await change("/sections/" + section.id, "DELETE");
                }}
              >
                Remove
              </Action>
            </div>
            <div className="stack">
              {section.blocks.map((block, j) => (
                <div
                  className="panel"
                  style={{ background: "var(--canvas)" }}
                  key={block.id}
                >
                  <div className="actions">
                    <h3 style={{ flex: 1 }}>{block.blockType.name}</h3>
                    <small>
                      {block.complete
                        ? "Ready for the website"
                        : "Needs more photos"}
                    </small>
                    <Action
                      className="text-button"
                      disabled={j === 0}
                      onClick={async () => {
                        const ids = section.blocks.map((b) => b.id);
                        [ids[j], ids[j - 1]] = [ids[j - 1], ids[j]];
                        await change(
                          "/sections/" + section.id + "/blocks/reorder",
                          "POST",
                          { ids },
                        );
                      }}
                    >
                      Move up
                    </Action>
                    <Action
                      className="text-button"
                      onClick={() => change("/blocks/" + block.id, "DELETE")}
                    >
                      Remove block
                    </Action>
                  </div>
                  <form
                    className="form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const chosen = Array.from(
                        { length: block.blockType.maxPhotos },
                        (_, n) => ({
                          photoId: String(f.get("photo" + n) || ""),
                          captionOverride:
                            String(f.get("caption" + n) || "") || null,
                        }),
                      ).filter((p) => p.photoId);
                      if (
                        new Set(chosen.map((p) => p.photoId)).size !==
                        chosen.length
                      ) {
                        setError("Choose each photo only once per block.");
                        return;
                      }
                      try {
                        await change("/blocks/" + block.id + "/photos", "PUT", {
                          photos: chosen,
                        });
                        setError("");
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  >
                    {Array.from(
                      { length: block.blockType.maxPhotos },
                      (_, n) => (
                        <div className="grid-2" key={n}>
                          <label>
                            Photograph {n + 1}
                            <select
                              name={"photo" + n}
                              defaultValue={block.photos[n]?.photo.id || ""}
                            >
                              <option value="">No photograph</option>
                              {photos.data?.items.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.caption || p.originalFilename}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Caption for this placement
                            <input
                              name={"caption" + n}
                              maxLength={300}
                              defaultValue={
                                block.photos[n]?.captionOverride || ""
                              }
                            />
                          </label>
                        </div>
                      ),
                    )}
                    <button className="button secondary">
                      Save block photos
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <label style={{ marginTop: 22 }}>
              Add a layout block
              <select
                value=""
                onChange={async (e) => {
                  const blockTypeId = e.target.value;
                  if (blockTypeId)
                    try {
                      await change(
                        "/sections/" + section.id + "/blocks",
                        "POST",
                        { blockTypeId },
                      );
                    } catch (e) {
                      setError(errorMessage(e));
                    }
                }}
              >
                <option value="">Choose a block style</option>
                {types.data?.blockTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.minPhotos}–{t.maxPhotos} photos
                  </option>
                ))}
              </select>
            </label>
          </section>
        ))}
      </div>
    </>
  );
}
