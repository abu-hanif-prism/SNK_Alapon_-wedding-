import { GuestUpload } from "@/components/guest";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <GuestUpload token={token} />;
}
