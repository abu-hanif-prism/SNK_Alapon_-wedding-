import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  objectKeyFor,
  sanitizeFilename,
  uploadFileSchema,
  uploadFilesSchema,
  variantKeyFor,
} from "../../src/lib/uploadRules";

describe("sanitizeFilename", () => {
  it("keeps only the file name, never a path", () => {
    expect(sanitizeFilename("C:\\fakepath\\pic.jpg")).toBe("pic.jpg");
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
  });

  it("removes control characters and trims", () => {
    expect(sanitizeFilename("a\u0000b\u001f.jpg  ")).toBe("ab.jpg");
  });

  it("never returns an empty name and caps the length", () => {
    expect(sanitizeFilename("")).toBe("photo");
    expect(sanitizeFilename("/")).toBe("photo");
    expect(sanitizeFilename("x".repeat(500)).length).toBe(200);
  });
});

describe("object keys", () => {
  it("builds predictable keys from ids only (never from user text)", () => {
    expect(objectKeyFor("e1", "p1", "image/png")).toBe("events/e1/originals/p1.png");
    expect(objectKeyFor("e1", "p1", "image/jpeg")).toBe("events/e1/originals/p1.jpg");
    expect(variantKeyFor("e1", "p1", "thumbnail")).toBe("events/e1/variants/p1/thumbnail.webp");
  });
});

describe("uploadFileSchema", () => {
  const valid = { filename: "a.jpg", contentType: "image/jpeg", byteSize: 1000 };

  it("accepts jpeg, png and webp up to the size limit", () => {
    expect(uploadFileSchema.safeParse(valid).success).toBe(true);
    expect(uploadFileSchema.safeParse({ ...valid, contentType: "image/png" }).success).toBe(true);
    expect(uploadFileSchema.safeParse({ ...valid, contentType: "image/webp" }).success).toBe(true);
    expect(uploadFileSchema.safeParse({ ...valid, byteSize: MAX_FILE_BYTES }).success).toBe(true);
  });

  it("rejects other types, empty files and oversized files", () => {
    expect(uploadFileSchema.safeParse({ ...valid, contentType: "image/gif" }).success).toBe(false);
    expect(uploadFileSchema.safeParse({ ...valid, contentType: "application/pdf" }).success).toBe(false);
    expect(uploadFileSchema.safeParse({ ...valid, byteSize: 0 }).success).toBe(false);
    expect(uploadFileSchema.safeParse({ ...valid, byteSize: MAX_FILE_BYTES + 1 }).success).toBe(false);
    expect(uploadFileSchema.safeParse({ ...valid, byteSize: 1.5 }).success).toBe(false);
  });

  it("limits a request to 20 files", () => {
    expect(uploadFilesSchema.safeParse(Array(20).fill(valid)).success).toBe(true);
    expect(uploadFilesSchema.safeParse(Array(21).fill(valid)).success).toBe(false);
    expect(uploadFilesSchema.safeParse([]).success).toBe(false);
  });
});
