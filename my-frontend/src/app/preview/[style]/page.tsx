import { KeepsakePreview } from "@/components/keepsake-preview";
import { Preview } from "@/components/preview";
import { notFound } from "next/navigation";
import "../../gallery.css";
import "../../figma-preview.css";
export default async function Page({
  params,
}: {
  params: Promise<{ style: string }>;
}) {
  const { style } = await params;
  if (!["minimal", "premiere", "keepsake"].includes(style)) notFound();
  return style === "keepsake" ? <KeepsakePreview /> : <Preview style={style} />;
}
