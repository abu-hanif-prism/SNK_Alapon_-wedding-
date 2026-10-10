"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import MinimalMobile20 from "./previews/MinimalMobile20";
import MinimalMobile40 from "./previews/MinimalMobile40";
import MinimalMobile50 from "./previews/MinimalMobile50";
import MinimalTablet from "./previews/MinimalTablet";
import MinimalDesktop20 from "./previews/MinimalDesktop20";
import MinimalDesktop40 from "./previews/MinimalDesktop40";
import MinimalDesktop50 from "./previews/MinimalDesktop50";
import PremiereDesktop from "./previews/PremiereDesktop";
import PremiereMobile from "./previews/PremiereMobile";
import PremiereTablet from "./previews/PremiereTablet";
import { Lightbox } from "./gallery";
import assets from "@/lib/figma-assets.json";
import type { GalleryPhoto } from "@/lib/types";
export function Preview({ style }: { style: string }) {
  const [edition, setEdition] = useState(20),
    [width, setWidth] = useState(1440),
    [photo, setPhoto] = useState<GalleryPhoto | null>(null),
    [menu, setMenu] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const premiere = style === "premiere";
  const mobile = width <= 700;
  const tablet = width > 700 && width <= 1100;
  const sourceWidth = mobile ? 390 : tablet ? 768 : 1440;
  const scale = width / sourceWidth;
  const node = premiere
    ? mobile
      ? "6:6"
      : tablet
        ? "6:592"
        : "6:701"
    : mobile
      ? edition === 40
        ? "3:107"
        : edition === 50
          ? "3:289"
          : "3:6"
      : tablet
        ? "3:460"
        : edition === 40
          ? "5:5"
          : edition === 50
            ? "3:1029"
            : "3:532";
  const previewPhotos: GalleryPhoto[] = Object.values(assets[node])
    .filter((url) => url.endsWith(".png"))
    .map((url, i) => ({
      id: url,
      caption: "Wedding memory " + (i + 1),
      urls: { web: url, thumbnail: url },
    }));

  const height = premiere
    ? mobile
      ? 2639
      : tablet
        ? 3067
        : 3794
    : mobile
      ? { 20: 4914, 40: 7118, 50: 7853 }[edition] || 4914
      : tablet
        ? 4562
        : { 20: 6339, 40: 10004, 50: 8362 }[edition] || 6339;
  const Desktop =
    edition === 40
      ? MinimalDesktop40
      : edition === 50
        ? MinimalDesktop50
        : MinimalDesktop20;
  const Mobile =
    edition === 40
      ? MinimalMobile40
      : edition === 50
        ? MinimalMobile50
        : MinimalMobile20;
  return (
    <main id="main" style={{ background: premiere ? "#0c0b09" : "#faf6f0" }}>
      <div className="preview-stage" style={{ height: height * scale }}>
        <div
          className="figma-preview"
          style={{
            width: sourceWidth,
            transform: "scale(" + scale + ")",
            transformOrigin: "top left",
          }}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              e.target instanceof HTMLImageElement
            ) {
              e.preventDefault();
              e.target.click();
            }
          }}
          onClick={(e) => {
            if (e.target instanceof HTMLImageElement) {
              const path = new URL(e.target.src).pathname;
              const found = previewPhotos.find((p) => p.id === path);
              if (found) setPhoto(found);
            }
          }}
        >
          {premiere ? (
            mobile ? (
              <PremiereMobile />
            ) : tablet ? (
              <PremiereTablet />
            ) : (
              <PremiereDesktop />
            )
          ) : mobile ? (
            <Mobile />
          ) : tablet ? (
            <MinimalTablet />
          ) : (
            <Desktop />
          )}
        </div>
      </div>
      <div className="preview-banner">
        <Link href="/templates">← Styles</Link>
        <span>Preview</span>
        {!premiere && (
          <select
            aria-label="Photo edition"
            value={edition}
            onChange={(e) => setEdition(Number(e.target.value))}
          >
            <option value={20}>20 photos</option>
            <option value={40}>40 photos</option>
            <option value={50}>50 photos</option>
          </select>
        )}
        <Link href="/dashboard/events/new">Create yours →</Link>
      </div>
      <div className="gallery-controls">
        <button
          aria-label="Share preview"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href);
              setMessage("Preview link copied");
            } catch {
              setMessage("Copy the address from your browser to share.");
            }
          }}
        >
          ↗
        </button>
        <button
          aria-label="Preview menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          ☰
        </button>
      </div>
      {menu && (
        <nav className="gallery-menu">
          <Link href="/templates">Explore all styles</Link>
          <Link href="/register">Create your wedding space</Link>
          <button
            className="text-button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setMenu(false);
            }}
          >
            Back to the beginning
          </button>
        </nav>
      )}
      {message && (
        <div className="gallery-toast" role="status">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}
      {photo && (
        <Lightbox
          photos={previewPhotos}
          index={Math.max(
            0,
            previewPhotos.findIndex((p) => p.id === photo.id),
          )}
          onChange={(i) => setPhoto(previewPhotos[i])}
          onClose={() => setPhoto(null)}
        />
      )}
    </main>
  );
}
