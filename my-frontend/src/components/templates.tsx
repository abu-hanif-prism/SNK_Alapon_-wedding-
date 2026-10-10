"use client";
import Link from "next/link";
import { Brand, Heading } from "./ui";
import assets from "@/lib/figma-assets.json";
export const styles = [
  {
    code: "minimal",
    name: "The Minimal Edit",
    description:
      "Clean whitespace, refined typography and an intimate editorial rhythm.",
    image: assets["15:2173"].imgPreviewFrame,
  },
  {
    code: "premiere",
    name: "The Premiere",
    description:
      "Cinematic moments, rich dark tones and a celebration in every frame.",
    image: assets["15:2173"].imgPreviewFrame1,
  },
  {
    code: "keepsake",
    name: "The Keepsake",
    description:
      "Warm paper tones, handwritten touches and the charm of a treasured family album.",
    image: assets["15:2173"].imgPreviewFrame2,
  },
];
export function Templates() {
  return (
    <>
      <header className="topbar">
        <Brand />
        <Link href="/dashboard">My workspace</Link>
      </header>
      <main id="main" className="container">
        <div className="center-heading">
          <Heading
            eyebrow="Your day, your point of view"
            title="Find your editorial style"
          >
            A beautiful setting for the moments that matter.
          </Heading>
        </div>
        <div className="grid-3">
          {styles.map((s) => (
            <article key={s.code} className="panel template-card">
              <img src={s.image} alt={s.name + " template preview"} />
              <h2>{s.name}</h2>
              <p>{s.description}</p>
              <div className="actions">
                <Link className="button secondary" href={"/preview/" + s.code}>
                  Live preview
                </Link>
                <Link className="button" href="/dashboard/events/new">
                  Create my gallery
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
