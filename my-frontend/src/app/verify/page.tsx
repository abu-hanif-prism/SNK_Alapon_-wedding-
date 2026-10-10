import { VerifyPhone } from "@/components/auth";
import { Guard } from "@/components/session";
export default function Page() {
  return (
    <Guard>
      <VerifyPhone />
    </Guard>
  );
}
