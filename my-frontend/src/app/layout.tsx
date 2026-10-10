import type { Metadata } from "next";
import { SessionProvider } from "@/components/session";
import "./theme.css";
export const metadata: Metadata = { title: { default: "SNAPNKEEP ? The Wedding Time", template: "%s ? SNAPNKEEP" }, description: "A beautiful home for your wedding memories. Collect, curate and share your day." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><SessionProvider>{children}</SessionProvider></body></html>; }
