export type LinkState = "revoked" | "scheduled" | "open" | "closed";

export function linkState(link: { opensAt: Date; closesAt: Date; revokedAt: Date | null }, now = new Date()): LinkState {
  if (link.revokedAt) return "revoked";
  if (now < link.opensAt) return "scheduled";
  if (now > link.closesAt) return "closed";
  return "open";
}
