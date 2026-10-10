import { PublicGallery } from "@/components/gallery";
import "../../gallery.css";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicGallery slug={slug} />;
}
