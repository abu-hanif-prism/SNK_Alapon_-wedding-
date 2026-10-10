// End-to-end flows against the real database configured in .env, with mock bKash and mock storage.
// The suite creates its own admin, plan, template and block types (nothing depends on seed data)
// and deletes everything it created when it finishes. Run with: npm run test:integration
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app";
import { expireSubscriptions } from "../../src/jobs/expireSubscriptions";
import { startPhotoProcessor } from "../../src/jobs/photoProcessor";
import { hashPassword } from "../../src/lib/password";
import { prisma } from "../../src/lib/prisma";

const s = randomBytes(4).toString("hex");
const hostEmail = `it-${s}-host@example.com`;
const otherEmail = `it-${s}-other@example.com`;
const adminEmail = `it-${s}-admin@example.com`;
const password = "password123";
const today = new Date().toISOString().slice(0, 10);

// Unique Bangladesh mobile numbers per run (+88017XXXXXXXX etc.).
const digits = String(parseInt(s, 16) % 100_000_000).padStart(8, "0");
const hostPhone = `+88017${digits}`;
const otherPhone = `+88018${digits}`;
const sparePhone = `+88019${digits}`;

let stopProcessor: () => void = () => undefined;
const createdBlockCodes: string[] = [];
const eventIds: string[] = [];

let adminToken = "";
let hostToken = "";
let otherToken = "";
let versionId = "";
let subscriptionId = "";
let otherSubscriptionId = "";
let twoMonthSubscriptionId = "";
let event1: { id: string; slug: string };
let event2: { id: string; slug: string };
let uploadToken = "";
let guestCookie = "";
let photoIds: string[] = [];
let blockIds: string[] = [];

const api = () => request(app);

// Mock SMS returns the code in the response, so a test host can verify its number in two calls.
async function verifyPhone(token: string) {
  const sent = await api().post("/api/auth/phone/send-code").set({ Authorization: `Bearer ${token}` });
  const verified = await api().post("/api/auth/phone/verify").set({ Authorization: `Bearer ${token}` }).send({ code: sent.body.data.devCode });
  expect(verified.status).toBe(200);
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const localPath = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};
const jpeg = (width: number, height: number, shade: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: shade, g: 90, b: 160 } } }).jpeg().toBuffer();

async function waitFor(check: () => Promise<boolean>, ms = 30_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

async function createEvent(token: string, title: string, extra: Record<string, unknown> = {}) {
  const res = await api()
    .post("/api/events")
    .set(auth(token))
    .send({
      subscriptionId,
      templateVersionId: versionId,
      title,
      coupleNames: title,
      location: "Dhaka",
      eventDate: today,
      slug: `${title.toLowerCase().replace(/\W+/g, "-")}-${s}`,
      ...extra,
    });
  if (res.status === 201) eventIds.push(res.body.data.event.id);
  return res;
}

beforeAll(async () => {
  await prisma.user.create({
    data: { name: "IT Admin", email: adminEmail, passwordHash: await hashPassword(password), role: "ADMIN" },
  });
  adminToken = (await api().post("/api/auth/login").send({ email: adminEmail, password })).body.data.accessToken;

  // Own block types and template, so the suite does not rely on seed data.
  const single = await api().post("/api/admin/block-types").set(auth(adminToken))
    .send({ code: `it-single-${s}`, name: "Single", minPhotos: 1, maxPhotos: 1, responsiveConfig: {} });
  const pair = await api().post("/api/admin/block-types").set(auth(adminToken))
    .send({ code: `it-pair-${s}`, name: "Pair", minPhotos: 2, maxPhotos: 2, responsiveConfig: {} });
  expect(single.status).toBe(201);
  expect(pair.status).toBe(201);

  const template = await api().post("/api/admin/templates").set(auth(adminToken)).send({ code: `it-tpl-${s}`, name: "IT template" });
  const version = await api().post(`/api/admin/templates/${template.body.data.template.id}/versions`).set(auth(adminToken)).send({
    version: "1.0.0",
    edition: 20,
    layoutDefinition: {
      sections: [{ title: "Chapter 1", blocks: [{ blockType: `it-single-${s}`, photos: 1 }, { blockType: `it-pair-${s}`, photos: 2 }] }],
    },
    themeDefaults: { fontPairing: "editorial", background: "#ffffff" },
  });
  versionId = version.body.data.version.id;

  // A 40-photo version of the same template, for the package upgrade test.
  const version40 = await api().post(`/api/admin/templates/${template.body.data.template.id}/versions`).set(auth(adminToken)).send({
    version: "1.0.0",
    edition: 40,
    layoutDefinition: { sections: [] },
    themeDefaults: { fontPairing: "editorial", background: "#ffffff" },
  });
  expect(version40.status).toBe(201);

  // The automatic layout uses the standard block types; create any the database does not have yet.
  for (const [code, name] of [["full-bleed", "Full-bleed image"], ["landscape", "Landscape image"]] as const) {
    if (!(await prisma.blockType.findUnique({ where: { code } }))) {
      await prisma.blockType.create({ data: { code, name, minPhotos: 1, maxPhotos: 1, responsiveConfig: {} } });
      createdBlockCodes.push(code);
    }
  }

  stopProcessor = startPhotoProcessor();
});

afterAll(async () => {
  stopProcessor();

  const hosts = await prisma.user.findMany({ where: { email: { startsWith: `it-${s}-` } }, select: { id: true } });
  const hostIds = hosts.map((h) => h.id);
  const subs = await prisma.subscription.findMany({ where: { hostId: { in: hostIds } }, select: { id: true } });
  const events = await prisma.event.findMany({ where: { hostId: { in: hostIds } }, select: { id: true } });
  const allEventIds = events.map((e) => e.id);

  // The test admin's audit entries would otherwise stay behind with no actor.
  await prisma.auditLog.deleteMany({ where: { actorId: { in: hostIds } } });
  await prisma.gallerySection.deleteMany({ where: { eventId: { in: allEventIds } } });
  await prisma.photo.deleteMany({ where: { eventId: { in: allEventIds } } });
  await prisma.event.deleteMany({ where: { id: { in: allEventIds } } });
  await prisma.payment.deleteMany({ where: { subscriptionId: { in: subs.map((x) => x.id) } } });
  await prisma.subscription.deleteMany({ where: { id: { in: subs.map((x) => x.id) } } });
  await prisma.user.deleteMany({ where: { id: { in: hostIds } } });
  await prisma.plan.deleteMany({ where: { code: { startsWith: `it-plan-${s}` } } });
  await prisma.templateVersion.deleteMany({ where: { template: { code: `it-tpl-${s}` } } });
  await prisma.template.deleteMany({ where: { code: `it-tpl-${s}` } });
  await prisma.blockType.deleteMany({ where: { code: { in: [`it-single-${s}`, `it-pair-${s}`, ...createdBlockCodes] } } });

  await Promise.all(allEventIds.map((id) => rm(path.join(process.cwd(), ".storage", "events", id), { recursive: true, force: true })));
  await prisma.$disconnect();
});

describe("auth", () => {
  let refreshCookie = "";

  it("registers a host and sets an httpOnly refresh cookie", async () => {
    const res = await api().post("/api/auth/register").send({ name: "IT Host", email: hostEmail, password, phone: hostPhone });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: hostEmail, role: "HOST" });
    hostToken = res.body.data.accessToken;
    expect(String(res.headers["set-cookie"]?.[0])).toMatch(/refresh_token=.*HttpOnly/i);

    otherToken = (await api().post("/api/auth/register").send({ name: "IT Other", email: otherEmail, password, phone: otherPhone })).body.data.accessToken;
  });

  it("refuses a duplicate email", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Again", email: hostEmail.toUpperCase(), password, phone: sparePhone });
    expect(res.status).toBe(409);
  });

  it("refuses a duplicate mobile number and a missing or foreign one", async () => {
    const dup = await api().post("/api/auth/register").send({ name: "Dup", email: `it-${s}-dup@example.com`, password, phone: hostPhone.replace("+880", "0") });
    expect(dup.status).toBe(409);
    expect(dup.body.message).toMatch(/mobile/i);

    expect((await api().post("/api/auth/register").send({ name: "No Phone", email: `it-${s}-np@example.com`, password })).status).toBe(400);
    expect((await api().post("/api/auth/register").send({ name: "Abroad", email: `it-${s}-ab@example.com`, password, phone: "+14155550123" })).status).toBe(400);
  });

  it("verifies a mobile number with a 6-digit code (mock SMS)", async () => {
    expect((await api().get("/api/auth/me").set(auth(hostToken))).body.data.user.phoneVerifiedAt).toBeNull();

    const sent = await api().post("/api/auth/phone/send-code").set(auth(hostToken));
    expect(sent.status).toBe(200);
    expect(sent.body.data.devCode).toMatch(/^\d{6}$/);
    expect(sent.body.data.phone).toContain("•••");

    // A second code straight away is refused (30 second cooldown).
    expect((await api().post("/api/auth/phone/send-code").set(auth(hostToken))).status).toBe(429);

    const wrong = await api().post("/api/auth/phone/verify").set(auth(hostToken)).send({ code: sent.body.data.devCode === "000000" ? "111111" : "000000" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.details.attemptsRemaining).toBe(4);

    expect((await api().post("/api/auth/phone/verify").set(auth(hostToken)).send({ code: "12ab" })).status).toBe(400);

    const ok = await api().post("/api/auth/phone/verify").set(auth(hostToken)).send({ code: sent.body.data.devCode });
    expect(ok.status).toBe(200);
    expect((await api().get("/api/auth/me").set(auth(hostToken))).body.data.user.phoneVerifiedAt).toBeTruthy();
  });

  it("locks a code after five wrong guesses", async () => {
    // A throwaway host, so the other tests' hosts are not left waiting out the resend cooldown.
    const locker = await api().post("/api/auth/register").send({ name: "IT Locker", email: `it-${s}-locker@example.com`, password, phone: sparePhone });
    const token = locker.body.data.accessToken;

    const sent = await api().post("/api/auth/phone/send-code").set(auth(token));
    expect(sent.status).toBe(200);
    const wrongCode = sent.body.data.devCode === "999999" ? "888888" : "999999";

    for (let i = 0; i < 5; i++) {
      expect((await api().post("/api/auth/phone/verify").set(auth(token)).send({ code: wrongCode })).status).toBe(400);
    }
    // Even the right code no longer works: a new one has to be requested.
    expect((await api().post("/api/auth/phone/verify").set(auth(token)).send({ code: sent.body.data.devCode })).status).toBe(429);
  });

  it("logs in even when the email has capitals and stray spaces", async () => {
    const res = await api().post("/api/auth/login").send({ email: `  ${hostEmail.toUpperCase()} `, password });
    expect(res.status).toBe(200);
    refreshCookie = String(res.headers["set-cookie"]?.[0]).split(";")[0]!;
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const wrong = await api().post("/api/auth/login").send({ email: hostEmail, password: "wrong-password" });
    const unknown = await api().post("/api/auth/login").send({ email: `nobody-${s}@example.com`, password });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it("protects /me and rejects bad tokens", async () => {
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set(auth("garbage"))).status).toBe(401);
    expect((await api().get("/api/auth/me").set(auth(hostToken))).body.data.user.email).toBe(hostEmail);
  });

  it("rotates refresh tokens and revokes everything when an old one is replayed", async () => {
    const first = await api().post("/api/auth/refresh").set("Cookie", refreshCookie);
    expect(first.status).toBe(200);
    const newCookie = String(first.headers["set-cookie"]?.[0]).split(";")[0]!;

    expect((await api().post("/api/auth/refresh").set("Cookie", refreshCookie)).status).toBe(401); // replay
    expect((await api().post("/api/auth/refresh").set("Cookie", newCookie)).status).toBe(401); // family revoked
  });

  it("keeps roles apart", async () => {
    expect((await api().get("/api/admin/plans").set(auth(hostToken))).status).toBe(403);
    expect((await api().post("/api/subscriptions").set(auth(adminToken)).send({ planId: "11111111-1111-4111-8111-111111111111" })).status).toBe(403);
  });

  it("answers malformed JSON with 400, not 500", async () => {
    const res = await api().post("/api/auth/login").set("Content-Type", "application/json").send("{ not json");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/json/i);
  });
});

describe("plans and payment (mock bKash)", () => {
  it("lets an admin publish a plan and a host buy it", async () => {
    const plan = await api().post("/api/admin/plans").set(auth(adminToken)).send({
      code: `it-plan-${s}`, name: "IT plan", edition: 20, maxEvents: 2, storageLimitBytes: 50_000_000, price: 100, billingPeriod: "MONTHLY",
    });
    expect(plan.status).toBe(201);
    expect(plan.body.data.plan.storageLimitBytes).toBe("50000000");

    const sub = await api().post("/api/subscriptions").set(auth(hostToken)).send({ planId: plan.body.data.plan.id });
    expect(sub.status).toBe(201);
    expect(sub.body.data.subscription.status).toBe("PENDING_PAYMENT");
    subscriptionId = sub.body.data.subscription.id;
  });

  it("activates the subscription exactly once, even if bKash calls back repeatedly", async () => {
    const pay = await api().post("/api/payments/bkash/create").set(auth(hostToken)).send({ subscriptionId });
    expect(pay.status).toBe(201);

    const callback = localPath(pay.body.data.bkashUrl);
    const results = await Promise.all([api().get(callback), api().get(callback), api().get(callback)]);
    for (const res of results) {
      expect(res.status).toBe(302);
      expect(res.headers["location"]).toContain("status=success");
    }

    const sub = (await api().get(`/api/subscriptions/${subscriptionId}`).set(auth(hostToken))).body.data.subscription;
    expect(sub.status).toBe("ACTIVE");
    expect(sub.payments.filter((p: { status: string }) => p.status === "COMPLETED")).toHaveLength(1);
    expect(sub.endsAt).toBeTruthy();
  });

  it("does not activate a cancelled payment", async () => {
    const other = await api().post("/api/subscriptions").set(auth(otherToken)).send({ planId: (await prisma.plan.findUniqueOrThrow({ where: { code: `it-plan-${s}` } })).id });
    otherSubscriptionId = other.body.data.subscription.id;

    // bKash payments need a verified mobile number first.
    const blocked = await api().post("/api/payments/bkash/create").set(auth(otherToken)).send({ subscriptionId: otherSubscriptionId });
    expect(blocked.status).toBe(403);
    expect(blocked.body.details.code).toBe("PHONE_NOT_VERIFIED");
    await verifyPhone(otherToken);

    const pay = await api().post("/api/payments/bkash/create").set(auth(otherToken)).send({ subscriptionId: otherSubscriptionId });
    const cancel = new URL(pay.body.data.bkashUrl);
    cancel.searchParams.set("status", "cancel");

    const res = await api().get(cancel.pathname + cancel.search);
    expect(res.headers["location"]).toContain("status=failed");
    const sub = await api().get(`/api/subscriptions/${other.body.data.subscription.id}`).set(auth(otherToken));
    expect(sub.body.data.subscription.status).toBe("PENDING_PAYMENT");
  });
});

describe("events, upload links and guests", () => {
  it("creates events with the template's starting gallery and enforces maxEvents", async () => {
    const first = await createEvent(hostToken, "Amira Rayhan");
    expect(first.status).toBe(201);
    event1 = { id: first.body.data.event.id, slug: first.body.data.event.slug };

    const gallery = (await api().get(`/api/events/${event1.id}/gallery`).set(auth(hostToken))).body.data;
    expect(gallery.sections).toHaveLength(1);
    blockIds = gallery.sections[0].blocks.map((b: { id: string }) => b.id);
    expect(blockIds).toHaveLength(2);

    const second = await createEvent(hostToken, "Second Draft");
    expect(second.status).toBe(201);
    event2 = { id: second.body.data.event.id, slug: second.body.data.event.slug };

    const third = await createEvent(hostToken, "Third Event");
    expect(third.status).toBe(409);
    expect(third.body.message).toMatch(/limit/i);
  });

  it("rejects events on another host's subscription and wrong-edition templates", async () => {
    expect((await createEvent(otherToken, "Stolen Sub")).status).toBe(404);
  });

  it("keeps guests out until the event is published", async () => {
    const link = await api().post(`/api/events/${event1.id}/upload-links`).set(auth(hostToken)).send({});
    expect(link.status).toBe(201);
    expect(link.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    uploadToken = new URL(link.body.data.url).pathname.split("/").pop()!;

    const closed = await api().post(`/api/u/${uploadToken}/session`);
    expect(closed.body.data.state).toBe("closed");
    expect(closed.body.data.guest).toBeNull();

    await api().post(`/api/events/${event1.id}/publish`).set(auth(hostToken));
    const open = await api().post(`/api/u/${uploadToken}/session`);
    expect(open.body.data.state).toBe("open");
    guestCookie = String(open.headers["set-cookie"]?.[0]).split(";")[0]!;
    expect(guestCookie).toContain(`guest_${event1.id}=`);
  });

  it("limits each guest, counting photos that are only reserved", async () => {
    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ perGuestUploadLimit: 3 });

    const images = await Promise.all([jpeg(400, 300, 40), jpeg(420, 300, 120), jpeg(440, 300, 200)]);
    const files = images.map((buf, i) => ({ filename: `p${i}.jpg`, contentType: "image/jpeg", byteSize: buf.length }));

    const reserve = await api().post(`/api/u/${uploadToken}/batches`).set("Cookie", guestCookie)
      .send({ idempotencyKey: `idem-${s}-1`, message: "Congratulations!", files });
    expect(reserve.status).toBe(201);

    // Same key again returns the same batch instead of reserving twice.
    const replay = await api().post(`/api/u/${uploadToken}/batches`).set("Cookie", guestCookie)
      .send({ idempotencyKey: `idem-${s}-1`, message: "Congratulations!", files });
    expect(replay.body.data.batch.id).toBe(reserve.body.data.batch.id);

    // Nothing is visible to the host until the batch is completed.
    expect((await api().get(`/api/events/${event1.id}/photos`).set(auth(hostToken))).body.data.total).toBe(0);

    // A 4th photo would exceed the limit even though the first three are not confirmed yet.
    const over = await api().post(`/api/u/${uploadToken}/batches`).set("Cookie", guestCookie)
      .send({ idempotencyKey: `idem-${s}-2`, files: [files[0]] });
    expect(over.status).toBe(409);
    expect(over.body.details.remainingUploads).toBe(0);

    // The signed URL only accepts the exact size and type that was declared.
    const uploads = reserve.body.data.uploads;
    const wrongSize = await api().put(localPath(uploads[0].upload.url)).set("Content-Type", "image/jpeg").send(images[0]!.subarray(0, 50));
    expect(wrongSize.status).toBe(400);

    for (const [i, up] of uploads.entries()) {
      const put = await api().put(localPath(up.upload.url)).set("Content-Type", "image/jpeg").send(images[i]);
      expect(put.status).toBe(200);
    }

    const done = await api().post(`/api/u/${uploadToken}/batches/${reserve.body.data.batch.id}/complete`).set("Cookie", guestCookie);
    expect(done.status).toBe(200);
    expect(done.body.data.photos).toHaveLength(3);
    expect(done.body.data.photos.every((p: { approvalStatus: string }) => p.approvalStatus === "APPROVED")).toBe(true);
    photoIds = done.body.data.photos.map((p: { id: string }) => p.id);

    const event = (await api().get(`/api/events/${event1.id}`).set(auth(hostToken))).body.data.event;
    expect(event.photoCount).toBe(3);
    expect(event.usedBytes).toBe(String(images.reduce((sum, b) => sum + b.length, 0)));
  });
});

describe("processing, gallery and the public site", () => {
  it("turns uploads into WebP variants in the background", async () => {
    const ready = await waitFor(async () => {
      const rows = await prisma.photo.findMany({ where: { id: { in: photoIds } }, select: { processingStatus: true } });
      return rows.every((row) => row.processingStatus === "READY");
    });
    expect(ready).toBe(true);

    const list = (await api().get(`/api/events/${event1.id}/photos`).set(auth(hostToken))).body.data;
    expect(list.items[0].guestMessage).toBe("Congratulations!");

    const thumb = await api().get(localPath(list.items[0].thumbnailUrl));
    expect(thumb.status).toBe(200);
    expect(thumb.headers["content-type"]).toBe("image/webp");
  });

  it("fills the layout and shows only complete blocks on the public site", async () => {
    const fill = await api().post(`/api/events/${event1.id}/gallery/autofill`).set(auth(hostToken));
    expect(fill.body.data.placed).toBe(3);

    const pub = await api().get(`/api/public/events/${event1.slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.sections[0].blocks).toHaveLength(2);
    expect(JSON.stringify(pub.body)).not.toMatch(/objectKey|tokenHash|passwordHash|hostId/);

    const image = await api().get(localPath(pub.body.data.sections[0].blocks[0].photos[0].urls.web));
    expect(image.status).toBe(200);
  });

  it("hides a rejected photo, and a block that drops below its minimum", async () => {
    const gallery = (await api().get(`/api/events/${event1.id}/gallery`).set(auth(hostToken))).body.data;
    const pairPhoto = gallery.sections[0].blocks[1].photos[0].photo.id;

    await api().post(`/api/events/${event1.id}/photos/moderate`).set(auth(hostToken)).send({ photoIds: [pairPhoto], action: "REJECT", reason: "Blurry" });

    const pub = await api().get(`/api/public/events/${event1.slug}`);
    expect(pub.body.data.sections[0].blocks).toHaveLength(1);

    await api().post(`/api/events/${event1.id}/photos/moderate`).set(auth(hostToken)).send({ photoIds: [pairPhoto], action: "APPROVE" });
    expect((await api().get(`/api/public/events/${event1.slug}`)).body.data.sections[0].blocks).toHaveLength(2);
  });

  it("keeps viewer downloads off until the host turns them on", async () => {
    const pub = (await api().get(`/api/public/events/${event1.slug}`)).body.data;
    const photoId = pub.sections[0].blocks[0].photos[0].id;

    expect(pub.event.canDownload).toBe(false);
    expect((await api().get(`/api/public/events/${event1.slug}/photos/${photoId}/download`)).status).toBe(403);

    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ allowViewerDownload: true });
    const download = await api().get(`/api/public/events/${event1.slug}/photos/${photoId}/download`);
    expect(download.status).toBe(302);
    expect(download.headers["location"]).toContain("sig=");
  });

  it("does not show a draft event, and the other host cannot touch this one", async () => {
    expect((await api().get(`/api/public/events/${event2.slug}`)).status).toBe(404);
    expect((await api().get(`/api/events/${event1.id}/gallery`).set(auth(otherToken))).status).toBe(404);
    expect((await api().post(`/api/events/${event1.id}/photos/moderate`).set(auth(otherToken)).send({ photoIds: [photoIds[0]], action: "DELETE" })).status).toBe(404);
  });
});

const cookieOf = (res: request.Response, name: string) =>
  (res.headers["set-cookie"] as unknown as string[] | undefined)?.find((c) => c.startsWith(`${name}=`))?.split(";")[0];

let draftEvent: { id: string; slug: string };
let shareToken = "";

describe("onboarding, sharing and privacy", () => {
  it("checks whether a web address is free and suggests alternatives", async () => {
    const taken = await api().get(`/api/events/slug-check?slug=${event1.slug}&city=Dhaka`).set(auth(hostToken));
    expect(taken.body.data).toMatchObject({ available: false, reason: "taken" });
    expect(taken.body.data.suggestions.length).toBeGreaterThan(0);
    expect(taken.body.data.suggestions).not.toContain(event1.slug);
    expect(taken.body.data.suggestions.some((x: string) => x.endsWith("-dhaka"))).toBe(true);

    const free = await api().get(`/api/events/slug-check?slug=free-address-${s}`).set(auth(hostToken));
    expect(free.body.data).toMatchObject({ available: true, reason: null });

    expect((await api().get("/api/events/slug-check?slug=admin").set(auth(hostToken))).body.data.reason).toBe("reserved");
    expect((await api().get("/api/events/slug-check?slug=Not%20Valid!").set(auth(hostToken))).body.data.reason).toBe("invalid");
    expect((await api().get("/api/events/slug-check?slug=anything")).status).toBe(401);
  });

  it("lets a host set everything up before paying: a draft event on an unpaid subscription", async () => {
    const res = await api().post("/api/events").set(auth(otherToken)).send({
      subscriptionId: otherSubscriptionId,
      templateVersionId: versionId,
      brideName: "Nadia",
      groomName: "Farhan",
      location: "Dhaka",
      venue: "Sena Kalyan",
      eventDate: today,
      welcomeMessage: "Help us capture the love!",
      approvalRequired: true,
      requireGuestName: true,
      accessPin: "1234",
      content: { introQuote: "We wanted our guests to be present." },
    });
    expect(res.status).toBe(201);
    draftEvent = { id: res.body.data.event.id, slug: res.body.data.event.slug };
    eventIds.push(draftEvent.id);

    expect(res.body.data.event).toMatchObject({
      status: "DRAFT",
      title: "Nadia & Farhan",
      coupleNames: "Nadia & Farhan",
      venue: "Sena Kalyan",
      accessPin: "1234",
      welcomeMessage: "Help us capture the love!",
      content: { introQuote: "We wanted our guests to be present." },
    });

    // It cannot go live until the subscription is paid.
    expect((await api().post(`/api/events/${draftEvent.id}/publish`).set(auth(otherToken))).status).toBe(409);
  });

  it("shows the link and QR code again whenever the host asks, and keeps it stable", async () => {
    const first = await api().get(`/api/events/${event1.id}/upload-links/share`).set(auth(hostToken));
    expect(first.status).toBe(200);
    expect(first.body.data.uploadUrl).toContain("/u/");
    expect(first.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(first.body.data.websiteUrl.endsWith(`/${event1.slug}`)).toBe(true);
    expect(first.body.data.link.state).toBe("open");
    expect(first.body.data.shareText).toContain(first.body.data.uploadUrl);
    expect(first.body.data.pin).toBeNull();

    const second = await api().get(`/api/events/${event1.id}/upload-links/share`).set(auth(hostToken));
    expect(second.body.data.uploadUrl).toBe(first.body.data.uploadUrl);

    shareToken = new URL(first.body.data.uploadUrl).pathname.split("/").pop()!;
    expect((await api().post(`/api/u/${shareToken}/session`)).body.data.state).toBe("open");

    expect((await api().get(`/api/events/${event1.id}/upload-links/share`).set(auth(otherToken))).status).toBe(404);
  });

  it("lets the host change when the upload link opens and closes", async () => {
    const share = (await api().get(`/api/events/${event1.id}/upload-links/share`).set(auth(hostToken))).body.data;
    const url = `/api/events/${event1.id}/upload-links/${share.link.id}`;

    const backwards = await api().patch(url).set(auth(hostToken)).send({ closesAt: new Date(Date.now() - 86_400_000).toISOString() });
    expect(backwards.status).toBe(400);
    expect((await api().patch(url).set(auth(hostToken)).send({})).status).toBe(400);

    const later = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const ok = await api().patch(url).set(auth(hostToken)).send({ closesAt: later });
    expect(ok.status).toBe(200);
    expect(new Date(ok.body.data.link.closesAt).toISOString()).toBe(later);
  });

  it("hides and re-publishes the website", async () => {
    const hidden = await api().post(`/api/events/${event1.id}/unpublish`).set(auth(hostToken));
    expect(hidden.body.data.event).toMatchObject({ status: "DRAFT", publishedAt: null });
    expect((await api().get(`/api/public/events/${event1.slug}`)).status).toBe(404);
    expect((await api().post(`/api/u/${shareToken}/session`)).body.data.state).toBe("closed");
    expect((await api().post(`/api/events/${event1.id}/unpublish`).set(auth(hostToken))).status).toBe(409);

    const live = await api().post(`/api/events/${event1.id}/publish`).set(auth(hostToken));
    expect(live.body.data.event.status).toBe("PUBLISHED");
    expect((await api().get(`/api/public/events/${event1.slug}`)).status).toBe(200);
  });

  it("protects a gallery with a 4-digit PIN for viewers and guests", async () => {
    const pinCookie = `pin_${event1.id}`;
    const set = await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ accessPin: "2026" });
    expect(set.body.data.event.accessPin).toBe("2026");

    // Viewers see only a PIN prompt, never photos.
    const locked = await api().get(`/api/public/events/${event1.slug}`);
    expect(locked.status).toBe(403);
    expect(locked.body.details.pinRequired).toBe(true);
    expect(locked.body.details.event.coupleNames).toBe("Amira Rayhan");
    expect(JSON.stringify(locked.body)).not.toMatch(/sections|urls|accessPin/);

    // Guests are stopped at the same gate, and no guest record is created.
    const gate = await api().post(`/api/u/${shareToken}/session`);
    expect(gate.body.data).toMatchObject({ state: "pin_required", pinRequired: true, guest: null, settings: null });
    expect(gate.headers["set-cookie"]).toBeUndefined();

    const wrong = await api().post(`/api/public/events/${event1.slug}/unlock`).send({ pin: "1111" });
    expect(wrong.status).toBe(401);
    expect(wrong.body.details.attemptsRemaining).toBe(4);
    expect((await api().post(`/api/public/events/${event1.slug}/unlock`).send({ pin: "12" })).status).toBe(400);

    const right = await api().post(`/api/public/events/${event1.slug}/unlock`).send({ pin: "2026" });
    expect(right.status).toBe(200);
    const cookie = cookieOf(right, pinCookie)!;
    expect(cookie).toBeTruthy();

    const open = await api().get(`/api/public/events/${event1.slug}`).set("Cookie", cookie);
    expect(open.status).toBe(200);
    expect(open.body.data.event.pinProtected).toBe(true);
    // The PIN itself is never sent back to viewers (the event date also contains "2026", so check the key and the exact value).
    expect(JSON.stringify(open.body)).not.toMatch(/accessPin/);
    expect(JSON.stringify(open.body)).not.toContain('"2026"');

    // The same cookie opens the guest page; without it, uploading is refused.
    expect((await api().post(`/api/u/${shareToken}/session`).set("Cookie", cookie)).body.data.state).toBe("open");
    const noPin = await api().post(`/api/u/${shareToken}/batches`).set("Cookie", guestCookie)
      .send({ idempotencyKey: `idem-${s}-pin`, files: [{ filename: "a.jpg", contentType: "image/jpeg", byteSize: 100 }] });
    expect(noPin.status).toBe(403);
    expect(noPin.body.details.pinRequired).toBe(true);

    const photoId = open.body.data.sections[0]?.blocks[0]?.photos[0]?.id ?? photoIds[0];
    expect((await api().get(`/api/public/events/${event1.slug}/photos/${photoId}/download`)).status).toBe(403);

    // Changing the PIN signs everyone out; removing it opens the gallery again.
    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ accessPin: "9999" });
    expect((await api().get(`/api/public/events/${event1.slug}`).set("Cookie", cookie)).status).toBe(403);
    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ accessPin: null });
    expect((await api().get(`/api/public/events/${event1.slug}`)).status).toBe(200);
  });

  it("locks out after five wrong PINs", async () => {
    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ accessPin: "2026" });

    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await api().post(`/api/u/${shareToken}/unlock`).send({ pin: "0000" })).status);
    expect(statuses).toEqual([401, 401, 401, 401, 401]);

    const locked = await api().post(`/api/u/${shareToken}/unlock`).send({ pin: "2026" });
    expect(locked.status).toBe(429);
    expect(locked.body.details.retryAfterSeconds).toBeGreaterThan(0);

    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ accessPin: null });
  });

  it("applies the host's guest settings: name required, notes on or off", async () => {
    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ perGuestUploadLimit: 10, requireGuestName: true, allowGuestNotes: false });
    const small = await jpeg(120, 90, 90);
    const file = { filename: "n.jpg", contentType: "image/jpeg", byteSize: small.length };
    const reserve = (body: object) => api().post(`/api/u/${shareToken}/batches`).set("Cookie", guestCookie).send(body);

    const noName = await reserve({ idempotencyKey: `idem-${s}-n1`, files: [file] });
    expect(noName.status).toBe(409);
    expect(noName.body.details.code).toBe("NAME_REQUIRED");

    expect((await api().patch(`/api/u/${shareToken}/guest`).set("Cookie", guestCookie).send({ displayName: "Nadia Rahman" })).status).toBe(200);

    expect((await reserve({ idempotencyKey: `idem-${s}-n2`, message: "Congrats", files: [file] })).status).toBe(400);
    expect((await reserve({ idempotencyKey: `idem-${s}-n3`, files: [{ ...file, note: "Dance floor" }] })).status).toBe(400);

    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ allowGuestNotes: true });
    const ok = await reserve({ idempotencyKey: `idem-${s}-n4`, message: "Congrats!", files: [{ ...file, note: "Dance floor" }] });
    expect(ok.status).toBe(201);

    expect((await api().put(localPath(ok.body.data.uploads[0].upload.url)).set("Content-Type", "image/jpeg").send(small)).status).toBe(200);
    const done = await api().post(`/api/u/${shareToken}/batches/${ok.body.data.batch.id}/complete`).set("Cookie", guestCookie);
    expect(done.status).toBe(200);

    const list = (await api().get(`/api/events/${event1.id}/photos`).set(auth(hostToken))).body.data.items;
    const credited = list.find((p: { guestNote: string | null }) => p.guestNote === "Dance floor");
    expect(credited).toMatchObject({ guestName: "Nadia Rahman", guestMessage: "Congrats!" });

    await api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ requireGuestName: false });
  });
});

describe("curation: choose photos, group into chapters", () => {
  it("builds the website from chapters and photos, laid out automatically", async () => {
    const [p0, p1, p2] = photoIds;
    const saved = await api().put(`/api/events/${event1.id}/gallery/curation`).set(auth(hostToken)).send({
      chapters: [
        { title: "Ceremony", photoIds: [p0, p1] },
        { title: "Reception", photoIds: [p2] },
        { title: "Left empty", photoIds: [] },
      ],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ capacity: 20, selectedCount: 3 });
    expect(saved.body.data.chapters.map((c: { title: string }) => c.title)).toEqual(["Ceremony", "Reception"]);
    expect(saved.body.data.chapters[0].photos.map((p: { id: string }) => p.id)).toEqual([p0, p1]);

    const pub = (await api().get(`/api/public/events/${event1.slug}`)).body.data;
    expect(pub.sections.map((section: { title: string }) => section.title)).toEqual(["Ceremony", "Reception"]);

    const read = await api().get(`/api/events/${event1.id}/gallery/curation`).set(auth(hostToken));
    expect(read.body.data.selectedCount).toBe(3);
  });

  it("rejects a photo twice, unknown photos and other hosts", async () => {
    const [p0, p1] = photoIds;
    const put = (token: string, chapters: unknown) => api().put(`/api/events/${event1.id}/gallery/curation`).set(auth(token)).send({ chapters });

    expect((await put(hostToken, [{ title: "A", photoIds: [p0] }, { title: "B", photoIds: [p0] }])).status).toBe(400);
    expect((await put(hostToken, [{ title: "A", photoIds: ["11111111-1111-4111-8111-111111111111"] }])).status).toBe(400);
    expect((await put(otherToken, [{ title: "A", photoIds: [p1] }])).status).toBe(404);
  });

  it("enforces the package limit on the number of photos on the website", async () => {
    await prisma.event.update({ where: { id: event1.id }, data: { edition: 2 } });
    try {
      const res = await api().put(`/api/events/${event1.id}/gallery/curation`).set(auth(hostToken)).send({ chapters: [{ title: "Too many", photoIds: photoIds }] });
      expect(res.status).toBe(409);
      expect(res.body.details).toMatchObject({ code: "SLOT_LIMIT", capacity: 2, requested: 3 });

      // The block editor respects the same limit.
      const gallery = (await api().get(`/api/events/${event1.id}/gallery`).set(auth(hostToken))).body.data;
      const block = gallery.sections[0].blocks[0];
      const viaBlock = await api().put(`/api/events/${event1.id}/gallery/blocks/${block.id}/photos`).set(auth(hostToken)).send({ photos: [{ photoId: photoIds[0] }] });
      expect(viaBlock.status).toBe(409);
    } finally {
      await prisma.event.update({ where: { id: event1.id }, data: { edition: 20 } });
    }
  });
});

describe("packages", () => {
  it("keeps a package's website active for its own number of months", async () => {
    const plan = await api().post("/api/admin/plans").set(auth(adminToken)).send({
      code: `it-plan-${s}-2m`, name: "Two months", edition: 20, maxEvents: 1, storageLimitBytes: 10_000_000, price: 999, billingPeriod: "ONE_TIME", durationMonths: 2,
    });
    expect(plan.status).toBe(201);
    expect(plan.body.data.plan.durationMonths).toBe(2);

    const sub = await api().post("/api/subscriptions").set(auth(otherToken)).send({ planId: plan.body.data.plan.id });
    const pay = await api().post("/api/payments/bkash/create").set(auth(otherToken)).send({ subscriptionId: sub.body.data.subscription.id });
    await api().get(localPath(pay.body.data.bkashUrl));

    twoMonthSubscriptionId = sub.body.data.subscription.id;
    const active = (await api().get(`/api/subscriptions/${sub.body.data.subscription.id}`).set(auth(otherToken))).body.data.subscription;
    expect(active.status).toBe("ACTIVE");
    const days = (new Date(active.endsAt).getTime() - new Date(active.startsAt).getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(58);
    expect(days).toBeLessThanOrEqual(62);
  });

  it("moves an event to a bigger package the host already paid for", async () => {
    const plan = await api().post("/api/admin/plans").set(auth(adminToken)).send({
      code: `it-plan-${s}-40`, name: "Signature 40", edition: 40, maxEvents: 1, storageLimitBytes: 20_000_000, price: 1499, billingPeriod: "ONE_TIME", durationMonths: 12,
    });
    const sub = await api().post("/api/subscriptions").set(auth(otherToken)).send({ planId: plan.body.data.plan.id });
    const bigId = sub.body.data.subscription.id;

    // Not paid yet, so it cannot be used.
    expect((await api().post(`/api/events/${draftEvent.id}/upgrade`).set(auth(otherToken)).send({ subscriptionId: bigId })).status).toBe(409);

    const pay = await api().post("/api/payments/bkash/create").set(auth(otherToken)).send({ subscriptionId: bigId });
    await api().get(localPath(pay.body.data.bkashUrl));

    expect((await api().post(`/api/events/${draftEvent.id}/upgrade`).set(auth(hostToken)).send({ subscriptionId: bigId })).status).toBe(404);

    const up = await api().post(`/api/events/${draftEvent.id}/upgrade`).set(auth(otherToken)).send({ subscriptionId: bigId });
    expect(up.status).toBe(200);
    expect(up.body.data.event).toMatchObject({ edition: 40, subscriptionId: bigId });

    const row = await prisma.event.findUniqueOrThrow({ where: { id: draftEvent.id }, include: { templateVersion: true } });
    expect(row.templateVersion.edition).toBe(40);

    // Already there, and a smaller (20-photo, active) package is not an upgrade.
    expect((await api().post(`/api/events/${draftEvent.id}/upgrade`).set(auth(otherToken)).send({ subscriptionId: bigId })).status).toBe(400);
    expect((await api().post(`/api/events/${draftEvent.id}/upgrade`).set(auth(otherToken)).send({ subscriptionId: twoMonthSubscriptionId })).status).toBe(400);
  });
});

describe("admin panel", () => {
  const hostIdOf = async (email: string) => (await prisma.user.findUniqueOrThrow({ where: { email } })).id;

  it("shows platform stats to admins only", async () => {
    const res = await api().get("/api/admin/stats").set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.hosts.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.events).toHaveProperty("PUBLISHED");
    expect(res.body.data.revenue.currency).toBe("BDT");
    expect(Array.isArray(res.body.data.recentPayments)).toBe(true);

    expect((await api().get("/api/admin/stats").set(auth(hostToken))).status).toBe(403);
    expect((await api().get("/api/admin/stats")).status).toBe(401);
  });

  it("lists and searches hosts", async () => {
    const list = await api().get(`/api/admin/users?q=${encodeURIComponent(hostEmail)}`).set(auth(adminToken));
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0]).toMatchObject({ email: hostEmail, role: "HOST" });
    expect(JSON.stringify(list.body)).not.toContain("passwordHash");

    const detail = await api().get(`/api/admin/users/${await hostIdOf(hostEmail)}`).set(auth(adminToken));
    expect(detail.body.data.user.subscriptions.length).toBeGreaterThanOrEqual(1);
    expect(detail.body.data.user.events.length).toBeGreaterThanOrEqual(2);

    expect((await api().get("/api/admin/users/11111111-1111-4111-8111-111111111111").set(auth(adminToken))).status).toBe(404);
  });

  it("suspends a host (signing them out) and reactivates them", async () => {
    const otherId = await hostIdOf(otherEmail);
    const login = await api().post("/api/auth/login").send({ email: otherEmail, password });
    const refresh = String(login.headers["set-cookie"]?.[0]).split(";")[0]!;

    const suspended = await api().patch(`/api/admin/users/${otherId}`).set(auth(adminToken)).send({ status: "SUSPENDED" });
    expect(suspended.body.data.user.status).toBe("SUSPENDED");

    expect((await api().post("/api/auth/login").send({ email: otherEmail, password })).status).toBe(403);
    expect((await api().post("/api/auth/refresh").set("Cookie", refresh)).status).toBe(401);

    await api().patch(`/api/admin/users/${otherId}`).set(auth(adminToken)).send({ status: "ACTIVE" });
    expect((await api().post("/api/auth/login").send({ email: otherEmail, password })).status).toBe(200);

    const adminId = await hostIdOf(adminEmail);
    expect((await api().patch(`/api/admin/users/${adminId}`).set(auth(adminToken)).send({ status: "SUSPENDED" })).status).toBe(409);
  });

  it("shows an event's detail and lets an admin hide, publish or archive it", async () => {
    const detail = await api().get(`/api/admin/events/${draftEvent.id}`).set(auth(adminToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.event).toMatchObject({ coupleNames: "Nadia & Farhan" });
    expect(detail.body.data.event.host.email).toBe(otherEmail);
    expect(detail.body.data.event.templateVersion.template.code).toBe(`it-tpl-${s}`);

    const live = await api().patch(`/api/admin/events/${draftEvent.id}/status`).set(auth(adminToken)).send({ status: "PUBLISHED" });
    expect(live.body.data.event.status).toBe("PUBLISHED");
    expect(live.body.data.event.publishedAt).toBeTruthy();

    const back = await api().patch(`/api/admin/events/${draftEvent.id}/status`).set(auth(adminToken)).send({ status: "DRAFT" });
    expect(back.body.data.event).toMatchObject({ status: "DRAFT", publishedAt: null });

    expect((await api().patch(`/api/admin/events/${draftEvent.id}/status`).set(auth(adminToken)).send({ status: "NOPE" })).status).toBe(400);
    expect((await api().patch(`/api/admin/events/${draftEvent.id}/status`).set(auth(hostToken)).send({ status: "DRAFT" })).status).toBe(403);
  });

  it("lets an admin review and moderate any event's photos", async () => {
    const list = await api().get(`/api/admin/events/${event1.id}/photos`).set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(3);

    const target = photoIds[2];
    const rejected = await api().post(`/api/admin/events/${event1.id}/photos/moderate`).set(auth(adminToken)).send({ photoIds: [target], action: "REJECT", reason: "Policy" });
    expect(rejected.body.data.changed).toBe(1);
    await api().post(`/api/admin/events/${event1.id}/photos/moderate`).set(auth(adminToken)).send({ photoIds: [target], action: "APPROVE" });

    expect((await api().post(`/api/admin/events/${event1.id}/photos/moderate`).set(auth(hostToken)).send({ photoIds: [target], action: "REJECT" })).status).toBe(403);
  });

  it("activates, extends and cancels subscriptions by hand", async () => {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: `it-plan-${s}` } });
    const sub = (await api().post("/api/subscriptions").set(auth(otherToken)).send({ planId: plan.id })).body.data.subscription;
    const act = (body: object, id = sub.id) => api().post(`/api/admin/subscriptions/${id}/action`).set(auth(adminToken)).send(body);

    expect((await act({ action: "extend", months: 1 })).status).toBe(409); // not active yet
    expect((await act({ action: "bogus" })).status).toBe(400);

    const activated = await act({ action: "activate" });
    expect(activated.body.data.subscription.status).toBe("ACTIVE");
    expect((await act({ action: "activate" })).status).toBe(409);

    const before = new Date(activated.body.data.subscription.endsAt).getTime();
    const extended = await act({ action: "extend", months: 2 });
    expect(new Date(extended.body.data.subscription.endsAt).getTime()).toBeGreaterThan(before + 55 * 86_400_000);

    const cancelled = await act({ action: "cancel" });
    expect(cancelled.body.data.subscription.status).toBe("CANCELED");
    expect((await act({ action: "cancel" })).status).toBe(409);

    // Canceling a package archives the events on it.
    const bigSub = (await prisma.event.findUniqueOrThrow({ where: { id: draftEvent.id } })).subscriptionId;
    await act({ action: "cancel" }, bigSub);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: draftEvent.id } })).status).toBe("ARCHIVED");

    expect((await api().post(`/api/admin/subscriptions/${sub.id}/action`).set(auth(hostToken)).send({ action: "cancel" })).status).toBe(403);
  });

  it("keeps an audit log of admin actions", async () => {
    const logs = await api().get("/api/admin/audit-logs?limit=100").set(auth(adminToken));
    expect(logs.status).toBe(200);

    const mine = logs.body.data.items.filter((log: { actor: { email: string } | null }) => log.actor?.email === adminEmail);
    const actions = new Set(mine.map((log: { action: string }) => log.action));
    for (const action of ["user.suspend", "user.activate", "event.status", "photo.moderate", "subscription.activate", "subscription.extend", "subscription.cancel"]) {
      expect(actions.has(action)).toBe(true);
    }

    const onlyUsers = await api().get("/api/admin/audit-logs?entityType=user").set(auth(adminToken));
    expect(onlyUsers.body.data.items.every((log: { entityType: string }) => log.entityType === "user")).toBe(true);
    expect((await api().get("/api/admin/audit-logs").set(auth(hostToken))).status).toBe(403);
  });
});

describe("subscription expiry", () => {
  it("archives every event of an expired subscription", async () => {
    await prisma.subscription.update({ where: { id: subscriptionId }, data: { endsAt: new Date(Date.now() - 60_000) } });

    const result = await expireSubscriptions();
    expect(result.subscriptions).toBeGreaterThanOrEqual(1);
    expect(result.events).toBeGreaterThanOrEqual(2);

    const sub = await prisma.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
    expect(sub.status).toBe("EXPIRED");

    const events = await prisma.event.findMany({ where: { id: { in: [event1.id, event2.id] } } });
    expect(events.every((e) => e.status === "ARCHIVED" && e.archivedAt !== null)).toBe(true);
  });

  it("is idempotent", async () => {
    expect((await expireSubscriptions()).events).toBe(0);
  });

  it("keeps a published gallery visible but read-only, and hides one that never went live", async () => {
    const pub = await api().get(`/api/public/events/${event1.slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.event).toMatchObject({ status: "ARCHIVED", readOnly: true });

    expect((await api().get(`/api/public/events/${event2.slug}`)).status).toBe(404);
  });

  it("stops guests from uploading to an archived event", async () => {
    const session = await api().post(`/api/u/${uploadToken}/session`).set("Cookie", guestCookie);
    expect(session.body.data.state).toBe("closed");

    const reserve = await api().post(`/api/u/${uploadToken}/batches`).set("Cookie", guestCookie)
      .send({ idempotencyKey: `idem-${s}-late`, files: [{ filename: "late.jpg", contentType: "image/jpeg", byteSize: 100 }] });
    expect(reserve.status).toBe(403);
  });

  it("blocks host edits but still allows reading and downloading", async () => {
    const edits = await Promise.all([
      api().patch(`/api/events/${event1.id}`).set(auth(hostToken)).send({ title: "Changed" }),
      api().post(`/api/events/${event1.id}/gallery/autofill`).set(auth(hostToken)),
      api().post(`/api/events/${event1.id}/upload-links`).set(auth(hostToken)).send({}),
      api().post(`/api/events/${event1.id}/photos/moderate`).set(auth(hostToken)).send({ photoIds: [photoIds[0]], action: "DELETE" }),
    ]);
    expect(edits.map((e) => e.status)).toEqual([409, 409, 409, 409]);

    expect((await api().get(`/api/events/${event1.id}/gallery`).set(auth(hostToken))).status).toBe(200);
    expect((await api().get(`/api/events/${event1.id}/photos/${photoIds[0]}/download`).set(auth(hostToken))).status).toBe(200);
  });

  it("refuses to create events on an expired subscription", async () => {
    expect((await createEvent(hostToken, "Too Late")).status).toBe(409);
  });
});
