import { test, expect, type Page } from "@playwright/test";
const id = "c665fd19-930e-4bde-b197-793bb4ddf166";
const host = {
  id,
  name: "Amira Rahman",
  email: "amira@example.test",
  phone: "+8801712345678",
  role: "HOST",
  phoneVerifiedAt: "2026-10-10",
};
const event = {
  id,
  title: "Amira & Rayhan",
  coupleNames: "Amira & Rayhan",
  slug: "amira-rayhan",
  eventDate: "2026-12-14",
  location: "Dhaka",
  venue: "Garden",
  status: "PUBLISHED",
  photoCount: 12,
  edition: 40,
  perGuestUploadLimit: 10,
  approvalRequired: true,
  allowViewerDownload: false,
  requireGuestName: false,
  allowGuestNotes: true,
  accessPin: null,
  content: {},
  subscriptionId: id,
  templateVersionId: id,
};
const plan = {
  id,
  name: "The Signature 40",
  code: "signature-40",
  edition: 40,
  maxEvents: 2,
  storageLimitBytes: "5368709120",
  price: "1499",
  currency: "BDT",
  durationMonths: 2,
  billingPeriod: "ONE_TIME",
  isActive: true,
};
const sub = {
  id,
  status: "ACTIVE",
  edition: 40,
  maxEvents: 2,
  storageLimitBytes: "5368709120",
  usedBytes: "10485760",
  endsAt: "2026-12-31",
  plan,
};
const photo = {
  id,
  originalFilename: "wedding.jpg",
  thumbnailUrl: "/figma/15-2775-imgRectangle.png",
  approvalStatus: "APPROVED",
  processingStatus: "READY",
  guestName: "Farhana",
  caption: "A beautiful evening",
  deletedAt: null,
};
async function api(
  page: Page,
  role = "HOST",
  extra: Record<string, unknown> = {},
) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  await page.route("http://localhost:5000/api/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "authorization,content-type",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE",
        },
      });
      return;
    }
    const path = new URL(req.url()).pathname.replace("/api", "");
    calls.push({ path, method: req.method(), body: req.postDataJSON() });
    let data: unknown = extra[path];
    let status = 200;
    if (data === undefined) {
      if (path === "/auth/refresh") {
        if (role === "NONE") {
          status = 401;
          data = {};
        } else data = { user: { ...host, role }, accessToken: "fixture-token" };
      } else if (path === "/auth/login" || path === "/auth/register")
        data = {
          user: { ...host, role: "HOST" },
          accessToken: "fixture-token",
        };
      else if (path === "/events")
        data = req.method() === "POST" ? { event } : { events: [event] };
      else if (path === "/events/slug-check") data = { available: true };
      else if (path === "/events/" + id) data = { event };
      else if (path === "/events/" + id + "/photos")
        data = { items: [photo], total: 1, page: 1, limit: 30 };
      else if (path === "/events/" + id + "/gallery/curation")
        data = {
          chapters: [{ title: "Before the ceremony", photos: [{ id }] }],
        };
      else if (path === "/subscriptions") data = { subscriptions: [sub] };
      else if (path === "/subscriptions/" + id) data = { subscription: sub };
      else if (path === "/plans") data = { plans: [plan] };
      else if (path === "/templates")
        data = {
          templates: [
            {
              id,
              code: "minimal-edit",
              name: "The Minimal Edit",
              versions: [{ id, edition: 40, version: "1" }],
            },
          ],
        };
      else if (path === "/admin/users")
        data = { items: [host], total: 1, page: 1, limit: 25 };
      else if (path === "/admin/stats")
        data = {
          hosts: { total: 12, last30Days: 3 },
          events: { DRAFT: 3, PUBLISHED: 9 },
          subscriptions: { active: 10 },
          photos: { total: 324 },
          revenue: { total: "19000", last30Days: "5000", currency: "BDT" },
        };
      else data = {};
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({
        success: status === 200,
        data,
        message: status === 401 ? "Not signed in" : undefined,
      }),
    });
  });
  return calls;
}
test("register sends backend schema and opens phone verification", async ({
  page,
}) => {
  const calls = await api(page, "NONE");
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Amira Rahman");
  await page.getByLabel("Bangladesh mobile number").fill("01712345678");
  await page.getByLabel("Email address").fill("amira@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/verify$/);
  expect(calls.find((c) => c.path === "/auth/register")?.body).toEqual({
    name: "Amira Rahman",
    phone: "01712345678",
    email: "amira@example.test",
    password: "test-password-123",
  });
});
test("role guard prevents host from opening admin", async ({ page }) => {
  await api(page);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", {
      name: "This workspace is for administrators.",
    }),
  ).toBeVisible();
});
test("host event list and moderation use real endpoint shapes", async ({
  page,
}) => {
  const calls = await api(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your celebrations" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Amira & Rayhan/ }).click();
  await expect(page.getByRole("heading", { name: "Farhana" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Select wedding.jpg" }).check();
  await page.getByRole("button", { name: "Approve selected" }).click();
  await expect
    .poll(() => calls.some((c) => c.path.endsWith("/photos/moderate")))
    .toBe(true);
  expect(calls.find((c) => c.path.endsWith("/photos/moderate"))?.body).toEqual({
    photoIds: [id],
    action: "APPROVE",
  });
});
test("event creation sends subscription template privacy and date fields", async ({
  page,
}) => {
  const calls = await api(page);
  await page.goto("/dashboard/events/new");
  await page.getByLabel("Bride’s name").fill("Amira");
  await page.getByLabel("Groom’s name").fill("Rayhan");
  await page.getByLabel("Wedding date").fill("2026-12-14");
  await page.getByLabel("Subscription", { exact: true }).selectOption(id);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("radio").check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Create wedding space" }).click();
  await expect(page).toHaveURL(new RegExp("/dashboard/events/" + id + "$"));
  expect(
    calls.find((c) => c.path === "/events" && c.method === "POST")?.body,
  ).toMatchObject({
    brideName: "Amira",
    groomName: "Rayhan",
    eventDate: "2026-12-14",
    subscriptionId: id,
    templateVersionId: id,
    approvalRequired: true,
    timezone: "Asia/Dhaka",
  });
});
test("gallery editor saves ordered chapters", async ({ page }) => {
  const calls = await api(page);
  await page.goto("/dashboard/events/" + id + "/gallery");
  await page.getByLabel("Chapter title").fill("Dinner under the stars");
  await page.getByRole("button", { name: "Save gallery layout" }).click();
  await expect(
    page.getByText("Your gallery layout has been saved."),
  ).toBeVisible();
  expect(calls.find((c) => c.method === "PUT")?.body).toEqual({
    chapters: [{ title: "Dinner under the stars", photoIds: [id] }],
  });
});
test("guest closed state does not offer uploads", async ({ page }) => {
  await api(page, "NONE", {
    "/u/test-upload-token-123456/session": {
      state: "closed",
      pinRequired: false,
      event: { coupleNames: "Amira & Rayhan", slug: "amira-rayhan" },
      settings: null,
      guest: null,
      eventRemainingUploads: null,
      window: { opensAt: "2026-01-01", closesAt: "2026-02-01" },
    },
  });
  await page.goto("/u/test-upload-token-123456");
  await expect(
    page.getByRole("heading", { name: "The photo collection has closed" }),
  ).toBeVisible();
  await expect(page.locator("input[type=file]")).toHaveCount(0);
});
test("payment result verifies subscription instead of trusting status query", async ({
  page,
}) => {
  await api(page, "HOST", {
    ["/subscriptions/" + id]: {
      subscription: { ...sub, status: "PENDING_PAYMENT" },
    },
  });
  await page.goto("/payment/result?status=success&subscriptionId=" + id);
  await expect(page.getByText("PENDING_PAYMENT")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create your event" }),
  ).toHaveCount(0);
});
test("public gallery supports keyboard viewer and respects disabled downloads", async ({
  page,
}) => {
  const p = {
    id,
    caption: "The ceremony",
    urls: { web: photo.thumbnailUrl, thumbnail: photo.thumbnailUrl },
  };
  await api(page, "NONE", {
    "/public/events/amira-rayhan": {
      event: { ...event, canDownload: false, cover: p },
      template: { code: "minimal-edit", name: "The Minimal Edit" },
      sections: [
        {
          id: "chapter",
          title: "Before the ceremony",
          blocks: [
            {
              id: "block",
              type: { code: "portrait-pair" },
              photos: [p, { ...p, id: "second", caption: "The evening" }],
            },
          ],
        },
      ],
    },
  });
  await page.goto("/w/amira-rayhan");
  await page
    .getByRole("button", { name: "Open The ceremony", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("dialog").getByText("The evening", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download photograph" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("responsive screens have no page overflow and local assets load", async ({
  page,
}) => {
  await api(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of [
      "/",
      "/templates",
      "/dashboard",
      "/preview/minimal",
      "/preview/premiere",
    ]) {
      await page.goto(path);
      await page.locator("main:visible").first().waitFor();
      await page.waitForFunction(() =>
        Array.from(document.images).every((i) => i.complete),
      );
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        )
        .toBe(true);
      const broken = await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs
            .filter((i) => !(i as HTMLImageElement).naturalWidth)
            .map((i) => i.getAttribute("src")),
        );
      expect(broken).toEqual([]);
      if (path === "/preview/minimal" || path === "/" || path === "/dashboard")
        await page.screenshot({
          path:
            "test-results/" + path.replaceAll("/", "-") + "-" + width + ".png",
          fullPage: false,
        });
    }
  }
});

test("guest upload retry keeps its reservation and completes before success", async ({
  page,
}) => {
  const token = "guest-upload-token-123456";
  const base = "/u/" + token;
  const name = "15-2775-imgRectangle.png";
  const calls = await api(page, "NONE", {
    [base + "/session"]: {
      state: "open",
      pinRequired: false,
      event: { coupleNames: "Amira & Rayhan", slug: "amira-rayhan" },
      settings: {
        requireGuestName: false,
        allowGuestNotes: true,
        approvalRequired: true,
        perGuestUploadLimit: 10,
      },
      guest: { remainingUploads: 10, displayName: null },
      eventRemainingUploads: null,
      window: { opensAt: "2026-01-01", closesAt: "2027-01-01" },
    },
    [base + "/batches"]: {
      batch: { id, status: "RESERVED" },
      uploads: [
        {
          photoId: id,
          filename: name,
          upload: {
            url: "http://localhost:5000/storage/photo",
            method: "PUT",
            headers: { "Content-Type": "image/png" },
          },
        },
      ],
    },
    [base + "/batches/" + id + "/complete"]: { missing: [] },
  });
  let attempts = 0;
  await page.route("http://localhost:5000/storage/photo", async (route) => {
    const headers = {
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "PUT,OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    attempts++;
    await route.fulfill({ status: attempts === 1 ? 503 : 200, headers });
  });
  await page.goto("/u/" + token);
  await page
    .getByLabel("Select photographs")
    .setInputFiles("public/figma/" + name);
  await page.getByRole("button", { name: /Review 1 photos/ }).click();
  await page.getByRole("button", { name: "Continue to final review" }).click();
  await page.getByRole("button", { name: "Send photos now" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Upload interrupted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry sending photos" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Thank you for being part of our story.",
    }),
  ).toBeVisible();
  const reservations = calls.filter((c) => c.path === base + "/batches");
  expect(reservations).toHaveLength(2);
  expect(reservations[0].body).toEqual(reservations[1].body);
  expect(calls.filter((c) => c.path.endsWith("/complete"))).toHaveLength(1);
});
test("admin plan form sends the backend plan contract", async ({ page }) => {
  const calls = await api(page, "ADMIN", { "/admin/plans": { plans: [plan] } });
  await page.goto("/admin/plans");
  await page.getByRole("button", { name: "+ Create plan" }).click();
  await page.getByLabel("Name", { exact: true }).fill("The Intimate 20");
  await page.getByLabel("Unique code").fill("intimate-20");
  await page.getByLabel("Photo edition").fill("20");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(() =>
      calls.some((c) => c.path === "/admin/plans" && c.method === "POST"),
    )
    .toBe(true);
  expect(
    calls.find((c) => c.path === "/admin/plans" && c.method === "POST")?.body,
  ).toMatchObject({
    code: "intimate-20",
    name: "The Intimate 20",
    edition: 20,
    currency: "BDT",
    billingPeriod: "ONE_TIME",
    isActive: true,
  });
});
test("40 and 50 photo previews load at mobile and desktop sizes", async ({
  page,
}) => {
  await api(page, "NONE");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/preview/minimal");
    for (const edition of ["40", "50"]) {
      await page
        .getByLabel("Photo edition")
        .filter({ visible: true })
        .selectOption(edition);
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll(".figma-preview img")).every(
          (i) =>
            (i as HTMLImageElement).complete &&
            (i as HTMLImageElement).naturalWidth > 0,
        ),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page
        .locator('.figma-preview img[role="button"]')
        .filter({ visible: true })
        .nth(1)
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Escape");
    }
  }
});
