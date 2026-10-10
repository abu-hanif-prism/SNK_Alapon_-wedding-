import { describe, expect, it } from "vitest";
import { isReservedSlug, SLUG_PATTERN, slugify, withRandomSuffix } from "../../src/lib/slug";

describe("slugify", () => {
  it("turns couple names into a URL slug", () => {
    expect(slugify("Amira & Rayhan")).toBe("amira-rayhan");
  });

  it("strips accents and punctuation", () => {
    expect(slugify("  José  &  Zoë! ")).toBe("jose-zoe");
  });

  it("falls back to 'event' when nothing usable remains", () => {
    expect(slugify("আমিরা ও রায়হান")).toBe("event");
    expect(slugify("ab")).toBe("event");
    expect(slugify("!!!")).toBe("event");
  });

  it("caps the length without leaving a trailing dash", () => {
    const slug = slugify("a".repeat(49) + " " + "b".repeat(20));
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slug rules", () => {
  it("accepts and rejects the right patterns", () => {
    for (const ok of ["a-b", "amira-rayhan-2026", "x1"]) expect(SLUG_PATTERN.test(ok)).toBe(true);
    for (const bad of ["-a", "a-", "a--b", "A", "a_b", "a b", ""]) expect(SLUG_PATTERN.test(bad)).toBe(false);
  });

  it("reserves words the site uses as routes", () => {
    for (const word of ["api", "admin", "u", "login", "templates", "preview", "verify"]) expect(isReservedSlug(word)).toBe(true);
    expect(isReservedSlug("amira-rayhan")).toBe(false);
  });

  it("adds a short random suffix", () => {
    expect(withRandomSuffix("x")).toMatch(/^x-[0-9a-f]{6}$/);
    expect(withRandomSuffix("x")).not.toBe(withRandomSuffix("x"));
  });
});
