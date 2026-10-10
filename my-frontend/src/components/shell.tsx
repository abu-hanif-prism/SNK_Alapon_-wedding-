"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./ui";
import { Guard, Logout, useSession } from "./session";
export function Shell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  const links = admin
    ? [
        ["/admin", "Overview"],
        ["/admin/users", "Hosts"],
        ["/admin/events", "Events & moderation"],
        ["/admin/plans", "Plans"],
        ["/admin/templates", "Templates"],
        ["/admin/block-types", "Layout blocks"],
        ["/admin/subscriptions", "Subscriptions"],
        ["/admin/payments", "Payments"],
        ["/admin/audit-logs", "Activity log"],
      ]
    : [
        ["/dashboard", "My events"],
        ["/dashboard/billing", "Plans & billing"],
        ["/templates", "Explore templates"],
        ["/dashboard/account", "My account"],
      ];
  return (
    <Guard admin={admin}>
      <div className="workspace">
        <aside className="sidebar">
          <Brand />
          <nav aria-label={admin ? "Admin navigation" : "Host navigation"}>
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? "active" : ""}
              >
                <span aria-hidden="true">◇</span>
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer">
            <strong>{user?.name}</strong>
            <p>
              <small>
                {admin ? "SNK administration" : "Your wedding workspace"}
              </small>
            </p>
            <Logout />
          </div>
        </aside>
        <main id="main" className="workspace-main">
          {children}
        </main>
      </div>
    </Guard>
  );
}
