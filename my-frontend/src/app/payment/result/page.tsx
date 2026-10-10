import { PaymentResult } from "@/components/billing";
import { Guard } from "@/components/session";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ subscriptionId?: string }>;
}) {
  const { subscriptionId } = await searchParams;
  return (
    <Guard>
      <PaymentResult subscriptionId={subscriptionId} />
    </Guard>
  );
}
