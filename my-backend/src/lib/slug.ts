import { randomBytes } from "node:crypto";

// Public gallery URLs live at the site root, so these must never be used as slugs.
const RESERVED = new Set([
  "api", "admin", "u", "www", "app", "login", "logout", "register", "signup", "onboarding", "dashboard",
  "payment", "settings", "privacy", "terms", "help", "static", "assets",
]);

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const isReservedSlug = (slug: string) => RESERVED.has(slug);

export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

  return slug.length >= 3 ? slug : "event";
}

export const withRandomSuffix = (slug: string) => `${slug}-${randomBytes(3).toString("hex")}`;
