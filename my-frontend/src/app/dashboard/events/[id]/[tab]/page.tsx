import { EventWorkspace } from "@/components/event-workspace";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const { id, tab } = await params;
  if (!["photos", "gallery", "layout", "share", "settings"].includes(tab))
    notFound();
  return <EventWorkspace id={id} tab={tab} />;
}
