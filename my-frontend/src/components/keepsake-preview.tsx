"use client";
import Link from "next/link";
import { GalleryView } from "./gallery";
import assets from "@/lib/figma-assets.json";
import type { GalleryData } from "@/lib/types";
const images = Object.values(assets["3:6"]).filter((v) => v.endsWith(".png"));
const photo = (n: number) => ({
  id: String(n),
  caption: [
    "A morning full of anticipation.",
    "The little details.",
    "Surrounded by love.",
  ][n % 3],
  urls: { web: images[n], thumbnail: images[n] },
});
const gallery: GalleryData = {
  event: {
    slug: "preview",
    coupleNames: "Amira & Rayhan",
    location: "Dhaka",
    eventDate: "2026-12-14",
    canDownload: false,
    readOnly: true,
    cover: photo(0),
    content: {
      introQuote: "A day to remember. A lifetime to keep.",
      closingText: "Thank you for filling our day with so much love.",
    },
  },
  template: { code: "the-keepsake", name: "The Keepsake" },
  sections: [
    {
      id: "morning",
      title: "The pages before forever",
      blocks: [
        {
          id: "pair",
          type: { code: "portrait-pair" },
          photos: [photo(1), photo(2)],
        },
        { id: "landscape", type: { code: "landscape" }, photos: [photo(4)] },
      ],
    },
    {
      id: "evening",
      title: "Dinner, dancing & everything between",
      blocks: [
        {
          id: "duo",
          type: { code: "offset-duo" },
          photos: [photo(6), photo(8)],
        },
        {
          id: "film",
          type: { code: "film-strip" },
          photos: [photo(12), photo(13), photo(14), photo(15)],
        },
      ],
    },
  ],
};
export function KeepsakePreview() {
  return (
    <>
      <GalleryView data={gallery} />
      <nav className="preview-banner">
        <Link href="/templates">← Styles</Link>
        <span>Sample keepsake</span>
        <Link href="/dashboard/events/new">Create yours →</Link>
      </nav>
    </>
  );
}
