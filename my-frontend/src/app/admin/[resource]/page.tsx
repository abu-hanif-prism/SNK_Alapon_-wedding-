import { AdminList } from "@/components/admin";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  if (
    ![
      "users",
      "events",
      "plans",
      "templates",
      "block-types",
      "subscriptions",
      "payments",
      "audit-logs",
    ].includes(resource)
  )
    notFound();
  return <AdminList resource={resource} />;
}
