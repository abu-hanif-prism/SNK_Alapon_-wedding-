import { describe, expect, it } from "vitest";
import { registerSchema } from "../../src/modules/auth/auth.schema";
import { createEventSchema, updateEventSchema } from "../../src/modules/events/events.schema";
import { setBlockPhotosSchema } from "../../src/modules/gallery/gallery.schema";
import { createPlanSchema, updatePlanSchema } from "../../src/modules/plans/plans.schema";
import { createBatchSchema } from "../../src/modules/uploads/uploads.schema";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("registerSchema", () => {
  const valid = { name: " Ana ", email: " Ana@Example.COM ", password: "password123", phone: "01712 345678" };

  it("normalises the email, name and mobile number", () => {
    const parsed = registerSchema.parse(valid);
    expect(parsed).toMatchObject({ name: "Ana", email: "ana@example.com", phone: "+8801712345678" });
  });

  it("rejects weak or malformed input", () => {
    expect(registerSchema.safeParse({ ...valid, name: "", email: "nope" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("requires a valid Bangladesh mobile number", () => {
    const { phone: _omit, ...withoutPhone } = valid;
    expect(registerSchema.safeParse(withoutPhone).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, phone: "+14155550123" }).success).toBe(false);
  });
});

describe("createEventSchema", () => {
  const minimal = {
    subscriptionId: uuid,
    templateVersionId: uuid,
    title: "Amira & Rayhan",
    coupleNames: "Amira & Rayhan",
    location: "Dhaka",
    eventDate: "2026-12-25",
  };

  it("fills in the defaults", () => {
    const parsed = createEventSchema.parse(minimal);
    expect(parsed).toMatchObject({
      timezone: "Asia/Dhaka",
      approvalRequired: false,
      allowViewerDownload: false,
      perGuestUploadLimit: 20,
    });
    expect(parsed.eventDate.toISOString()).toBe("2026-12-25T00:00:00.000Z");
  });

  it("rejects impossible dates, unknown time zones and reserved slugs", () => {
    expect(createEventSchema.safeParse({ ...minimal, eventDate: "2026-02-30" }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...minimal, timezone: "Mars/Base" }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...minimal, slug: "admin" }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...minimal, slug: "has space" }).success).toBe(false);
  });

  it("lowercases a custom slug", () => {
    expect(createEventSchema.parse({ ...minimal, slug: "Amira-Rayhan" }).slug).toBe("amira-rayhan");
  });

  it("builds the couple's names and title from bride and groom", () => {
    const { coupleNames: _c, title: _t, ...base } = minimal;
    const parsed = createEventSchema.parse({ ...base, brideName: "Amira", groomName: "Rayhan" });
    expect(parsed).toMatchObject({ coupleNames: "Amira & Rayhan", title: "Amira & Rayhan" });
    expect(createEventSchema.safeParse(base).success).toBe(false);
    expect(createEventSchema.safeParse({ ...base, brideName: "Amira" }).success).toBe(false);
  });

  it("accepts a 4-digit PIN only", () => {
    expect(createEventSchema.parse({ ...minimal, accessPin: "2026" }).accessPin).toBe("2026");
    for (const bad of ["202", "20266", "20a6", "abcd"]) {
      expect(createEventSchema.safeParse({ ...minimal, accessPin: bad }).success).toBe(false);
    }
  });

  it("only allows known template-copy keys", () => {
    expect(createEventSchema.safeParse({ ...minimal, content: { introQuote: "We wanted..." } }).success).toBe(true);
    expect(createEventSchema.safeParse({ ...minimal, content: { evil: "x" } }).success).toBe(false);
  });

  it("validates limits", () => {
    expect(createEventSchema.safeParse({ ...minimal, perGuestUploadLimit: 0 }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...minimal, perGuestUploadLimit: 501 }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...minimal, eventUploadLimit: null }).success).toBe(true);
  });
});

describe("updateEventSchema", () => {
  it("allows partial updates and clearing nullable fields", () => {
    expect(updateEventSchema.safeParse({}).success).toBe(true);
    expect(updateEventSchema.parse({ eventUploadLimit: null, themeOverrides: null })).toEqual({
      eventUploadLimit: null,
      themeOverrides: null,
    });
  });
});

describe("plan schemas", () => {
  const plan = {
    code: "Starter-20",
    name: "Starter",
    edition: 20,
    maxEvents: 2,
    storageLimitBytes: "5368709120",
    price: 499.5,
    billingPeriod: "YEARLY",
  };

  it("normalises code, price and storage size", () => {
    const parsed = createPlanSchema.parse(plan);
    expect(parsed.code).toBe("starter-20");
    expect(parsed.price).toBe("499.5");
    expect(parsed.storageLimitBytes).toBe(5368709120n);
    expect(parsed.currency).toBe("BDT");
    expect(parsed.isActive).toBe(true);
  });

  it("rejects bad money, sizes and periods", () => {
    expect(createPlanSchema.safeParse({ ...plan, price: "10.999" }).success).toBe(false);
    expect(createPlanSchema.safeParse({ ...plan, price: -1 }).success).toBe(false);
    expect(createPlanSchema.safeParse({ ...plan, storageLimitBytes: 0 }).success).toBe(false);
    expect(createPlanSchema.safeParse({ ...plan, billingPeriod: "WEEKLY" }).success).toBe(false);
  });

  it("does not let a partial update silently reset other fields", () => {
    expect(updatePlanSchema.parse({ price: 10 })).toEqual({ price: "10" });
  });
});

describe("createBatchSchema", () => {
  const file = { filename: "a.jpg", contentType: "image/jpeg", byteSize: 100 };

  it("needs a usable idempotency key", () => {
    expect(createBatchSchema.safeParse({ idempotencyKey: "short", files: [file] }).success).toBe(false);
    expect(createBatchSchema.safeParse({ idempotencyKey: "has spaces in it", files: [file] }).success).toBe(false);
    expect(createBatchSchema.safeParse({ idempotencyKey: "abcdefgh12345", files: [file] }).success).toBe(true);
  });

  it("trims the guest's message and caps it at 150 characters", () => {
    expect(createBatchSchema.parse({ idempotencyKey: "abcdefgh12345", message: "  hi  ", files: [file] }).message).toBe("hi");
    expect(createBatchSchema.safeParse({ idempotencyKey: "abcdefgh12345", message: "x".repeat(150), files: [file] }).success).toBe(true);
    expect(createBatchSchema.safeParse({ idempotencyKey: "abcdefgh12345", message: "x".repeat(151), files: [file] }).success).toBe(false);
  });

  it("accepts an optional note per photo", () => {
    const parsed = createBatchSchema.parse({ idempotencyKey: "abcdefgh12345", files: [{ ...file, note: " Dance floor " }] });
    expect(parsed.files[0]?.note).toBe("Dance floor");
  });
});

describe("setBlockPhotosSchema", () => {
  it("allows at most six photos per block", () => {
    const photos = (n: number) => Array.from({ length: n }, () => ({ photoId: uuid }));
    expect(setBlockPhotosSchema.safeParse({ photos: photos(6) }).success).toBe(true);
    expect(setBlockPhotosSchema.safeParse({ photos: photos(7) }).success).toBe(false);
    expect(setBlockPhotosSchema.safeParse({ photos: [] }).success).toBe(true);
  });
});
