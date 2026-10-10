import { describe, expect, it } from "vitest";
import { planBlocks, type BlockTypeLimits, type LayoutPhoto } from "../../src/modules/gallery/gallery.autolayout";

const types = new Map<string, BlockTypeLimits>([
  ["full-bleed", { min: 1, max: 1 }],
  ["landscape", { min: 1, max: 1 }],
  ["single-portrait", { min: 1, max: 1 }],
  ["portrait-pair", { min: 2, max: 2 }],
  ["offset-duo", { min: 2, max: 2 }],
  ["trio", { min: 3, max: 3 }],
  ["film-strip", { min: 2, max: 4 }],
]);

const landscape = (id: string): LayoutPhoto => ({ id, width: 1600, height: 1000 });
const portrait = (id: string): LayoutPhoto => ({ id, width: 1000, height: 1600 });
const many = (n: number, make = landscape) => Array.from({ length: n }, (_, i) => make(`p${i}`));

describe("planBlocks", () => {
  it("uses every photo exactly once, in order", () => {
    for (const n of [1, 2, 3, 7, 20, 40, 50]) {
      const photos = many(n);
      const planned = planBlocks(photos, types);
      expect(planned.flatMap((block) => block.photoIds)).toEqual(photos.map((p) => p.id));
    }
  });

  it("only picks block types that fit the number of photos", () => {
    const planned = planBlocks(many(50), types);
    for (const block of planned) {
      const limits = types.get(block.code)!;
      expect(block.photoIds.length).toBeGreaterThanOrEqual(limits.min);
      expect(block.photoIds.length).toBeLessThanOrEqual(limits.max);
    }
  });

  it("follows a 1-2-3-1-2-4 rhythm", () => {
    expect(planBlocks(many(13), types).map((block) => block.photoIds.length)).toEqual([1, 2, 3, 1, 2, 4]);
  });

  it("puts a portrait on its own as a single portrait, and two portraits as a pair", () => {
    expect(planBlocks([portrait("a")], types)[0]?.code).toBe("single-portrait");
    // The rhythm starts with a single, so the two portraits land together in the next block.
    const pair = planBlocks([landscape("x"), portrait("a"), portrait("b")], types);
    expect(pair.find((block) => block.photoIds.length === 2)?.code).toBe("portrait-pair");
  });

  it("opens with a full-bleed landscape and groups three as a trio", () => {
    const planned = planBlocks(many(6), types);
    expect(planned[0]?.code).toBe("full-bleed");
    expect(planned.find((block) => block.photoIds.length === 3)?.code).toBe("trio");
  });

  it("falls back to other block types when a preferred one is missing", () => {
    const small = new Map<string, BlockTypeLimits>([
      ["full-bleed", { min: 1, max: 1 }],
      ["film-strip", { min: 2, max: 4 }],
    ]);
    const planned = planBlocks(many(10), small);
    expect(planned.every((block) => small.has(block.code))).toBe(true);
    expect(planned.flatMap((block) => block.photoIds)).toHaveLength(10);
  });

  it("fails clearly when nothing can hold a group", () => {
    // Three photos make a single and then a pair, and a lone full-bleed type cannot hold the pair.
    expect(() => planBlocks(many(3), new Map([["full-bleed", { min: 1, max: 1 }]]))).toThrow(/2 photo/);
  });

  it("returns nothing for no photos", () => {
    expect(planBlocks([], types)).toEqual([]);
  });
});
