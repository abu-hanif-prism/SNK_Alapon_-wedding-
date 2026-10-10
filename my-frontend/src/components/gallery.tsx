"use client";
import { useEffect, useRef, useState } from "react";
import { request, errorMessage, API } from "@/lib/api";
import type { GalleryData, GalleryPhoto } from "@/lib/types";
import { Notice, Loading } from "./ui";
export function Lightbox({
  photos,
  index,
  onClose,
  onChange,
  download,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
  download?: (p: GalleryPhoto) => string;
}) {
  const start = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = old;
    };
  }, []);
  const next = (delta: number) =>
    onChange((index + delta + photos.length) % photos.length);
  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label="Fullscreen photo viewer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next(1);
        if (e.key === "ArrowLeft") next(-1);
      }}
    >
      <header>
        <span>
          {index + 1} / {photos.length}
        </span>
        <button autoFocus aria-label="Close photo viewer" onClick={onClose}>
          ×
        </button>
      </header>
      <div
        className="lightbox-image"
        onTouchStart={(e) => {
          start.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - start.current;
          if (Math.abs(dx) > 45) next(dx < 0 ? 1 : -1);
        }}
      >
        <button
          className="lightbox-prev"
          aria-label="Previous photo"
          onClick={() => next(-1)}
        >
          ‹
        </button>
        <img
          src={photos[index].urls.web}
          alt={photos[index].caption || "Wedding photograph"}
        />
        <button
          className="lightbox-next"
          aria-label="Next photo"
          onClick={() => next(1)}
        >
          ›
        </button>
      </div>
      <footer>
        <p>
          {photos[index].caption}
          {photos[index].credit ? " · Photo by " + photos[index].credit : ""}
        </p>
        {download && (
          <a href={download(photos[index])}>Download photograph ↓</a>
        )}
      </footer>
    </dialog>
  );
}
export function PublicGallery({ slug }: { slug: string }) {
  const [data, setData] = useState<GalleryData | null>(null),
    [error, setError] = useState(""),
    [pin, setPin] = useState(false);
  useEffect(() => {
    let live = true;
    request<GalleryData>(
      "/public/events/" + encodeURIComponent(slug),
      "GET",
      undefined,
      false,
    )
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) {
          setError(errorMessage(e));
          setPin(e.status === 403);
        }
      });
    return () => {
      live = false;
    };
  }, [slug]);
  if (!data)
    return (
      <main id="main" className="gallery-gate">
        {!error ? (
          <Loading />
        ) : (
          <>
            <h1>
              {pin
                ? "A private little world"
                : "This story is not available yet"}
            </h1>
            <Notice error>{error}</Notice>
            {pin && (
              <form
                className="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await request(
                      "/public/events/" + encodeURIComponent(slug) + "/unlock",
                      "POST",
                      { pin: new FormData(e.currentTarget).get("pin") },
                      false,
                    );
                    setData(
                      await request<GalleryData>(
                        "/public/events/" + encodeURIComponent(slug),
                        "GET",
                        undefined,
                        false,
                      ),
                    );
                    setError("");
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                <label>
                  Wedding PIN
                  <input
                    type="password"
                    name="pin"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
                  />
                </label>
                <button className="button">Enter gallery</button>
              </form>
            )}
          </>
        )}
      </main>
    );
  return <GalleryView data={data} />;
}
export function GalleryView({ data }: { data: GalleryData }) {
  const [index, setIndex] = useState<number | null>(null),
    [menu, setMenu] = useState(false),
    [message, setMessage] = useState("");
  const slug = data.event.slug;
  const photos = data.sections.flatMap((s) =>
    s.blocks.flatMap((b) => b.photos),
  );
  const all = data.event.cover ? [data.event.cover, ...photos] : photos;
  const unique = all.filter(
    (p, i) => all.findIndex((x) => x.id === p.id) === i,
  );
  const open = (p: GalleryPhoto) =>
    setIndex(unique.findIndex((x) => x.id === p.id));
  const premiere = data.template.code.includes("premiere");
  return (
    <main
      id="main"
      className={
        "live-gallery " +
        (premiere
          ? "premiere"
          : data.template.code.includes("keepsake")
            ? "keepsake"
            : "")
      }
    >
      <section className="gallery-cover">
        {data.event.cover && (
          <img src={data.event.cover.urls.web} alt={data.event.coupleNames} />
        )}
        <div className="gallery-cover-top">
          <i>{data.template.name}</i>
          <small>THE WEDDING TIME</small>
        </div>
        <div>
          <h1>{data.event.coupleNames}</h1>
          <p>
            {data.event.location} ·{" "}
            {new Date(data.event.eventDate).toLocaleDateString("en-GB", {
              timeZone: "UTC",
            })}
          </p>
        </div>
      </section>
      {data.event.content?.introQuote && (
        <blockquote>{data.event.content.introQuote}</blockquote>
      )}
      <div className="gallery-chapters">
        {data.sections.map((s) => (
          <section
            className="gallery-chapter"
            key={s.id}
            id={"chapter-" + s.id}
          >
            <h2>{s.title}</h2>
            {s.subtitle && <p>{s.subtitle}</p>}
            {s.blocks.map((b) => (
              <div className={"gallery-block block-" + b.type.code} key={b.id}>
                {b.photos.map((p) => (
                  <figure key={p.id}>
                    <button
                      onClick={() => open(p)}
                      aria-label={"Open " + (p.caption || "photo")}
                    >
                      <img
                        loading="lazy"
                        src={p.urls.web}
                        alt={p.caption || "Wedding memory"}
                      />
                    </button>
                    {p.caption && <figcaption>{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
      <footer className="gallery-closing">
        <h2>
          {data.event.content?.closingTitle ||
            "With love, " + data.event.coupleNames}
        </h2>
        <p>
          {data.event.content?.closingText ||
            "Thank you for being part of our story."}
        </p>
        <small>
          © {new Date().getFullYear()} · The Wedding Time by SNAPNKEEP
        </small>
      </footer>
      <div className="gallery-controls">
        <button
          aria-label="Share gallery"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: data.event.coupleNames,
                  url: location.href,
                });
              else {
                await navigator.clipboard.writeText(location.href);
                setMessage("Link copied");
              }
            } catch (e) {
              if (!(e instanceof DOMException && e.name === "AbortError"))
                setMessage(errorMessage(e));
            }
          }}
        >
          ↗
        </button>
        <button
          aria-label="Open chapter menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          ☰
        </button>
      </div>
      {message && (
        <div className="gallery-toast" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {menu && (
        <nav className="gallery-menu">
          {data.sections.map((s) => (
            <a
              key={s.id}
              href={"#chapter-" + s.id}
              onClick={() => setMenu(false)}
            >
              {s.title}
            </a>
          ))}
        </nav>
      )}
      {index !== null && (
        <Lightbox
          photos={unique}
          index={index}
          onChange={setIndex}
          onClose={() => setIndex(null)}
          download={
            data.event.canDownload
              ? (p) =>
                  API +
                  "/public/events/" +
                  encodeURIComponent(slug) +
                  "/photos/" +
                  p.id +
                  "/download"
              : undefined
          }
        />
      )}
    </main>
  );
}
