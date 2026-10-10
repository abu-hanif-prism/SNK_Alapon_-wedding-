# SNAPNKEEP — The Wedding Time

Next.js App Router frontend for the existing Express/Prisma backend in `../my-backend`.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The API defaults to http://localhost:5000/api. Set `NEXT_PUBLIC_API_URL` in `.env.local` if needed, then restart Next.js.

Run the backend separately using its existing environment and database setup. Its `FRONTEND_URL` and `CORS_ORIGIN` must include the frontend origin (`http://localhost:3000` locally). Start it with `npm run dev` from `../my-backend`. Existing `seed:starter` and `seed:admin` scripts provision plans/templates and the administrator; run these only against your intended database.

Use the same hostname for both services (localhost on both, rather than mixing localhost and 127.0.0.1). Production deployments need HTTPS and same-site API/frontend hosts for the existing refresh and guest cookies.

## Screens and routes

| Route                                                          | Purpose                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `/`, `/register`, `/login`, `/verify`                          | Welcome, registration, sign-in, mobile verification                   |
| `/templates`                                                   | Three editorial template styles                                       |
| `/preview/minimal`                                             | Figma gallery previews, 20/40/50 editions                             |
| `/preview/premiere`                                            | Separate Figma mobile/tablet/desktop Premiere previews                |
| `/preview/keepsake`                                            | Keepsake design extended from the Figma style card                    |
| `/dashboard`                                                   | Host events and storage overview                                      |
| `/dashboard/billing`                                           | Live plans, subscriptions and bKash handoff                           |
| `/dashboard/events/new`                                        | Event details, subscription, template, privacy and review             |
| `/dashboard/events/:id/photos`                                 | Host uploads, moderation, captions, cover and downloads               |
| `/dashboard/events/:id/gallery`                                | Ordered chapter curation and automatic layout                         |
| `/dashboard/events/:id/layout`                                 | Explicit blocks, photo placements and caption overrides               |
| `/dashboard/events/:id/share`                                  | Upload links, QR downloads, upload windows and revocation             |
| `/dashboard/events/:id/settings`                               | Event details, template, guest allowances and PIN                     |
| `/dashboard/account`                                           | Mobile number and verification                                        |
| `/payment/result`                                              | Server-verified subscription status after checkout                    |
| `/u/:token`                                                    | Cookie-based guest uploads, PIN gate, review, retry and closed states |
| `/:slug`, `/w/:slug`                                           | Published galleries and fullscreen keyboard/swipe viewer              |
| `/admin`                                                       | Platform statistics                                                   |
| `/admin/users`, `/admin/events`                                | Host status, event visibility and moderation                          |
| `/admin/plans`, `/admin/templates`, `/admin/block-types`       | Catalogue editing and immutable template versions                     |
| `/admin/subscriptions`, `/admin/payments`, `/admin/audit-logs` | Subscription actions, payments and audit history                      |

## Backend integration

`src/lib/api.ts` unwraps the backend `{ success, data, message, details }` envelope. Access tokens remain in memory. Refresh tokens and guest/PIN cookies use the backend's HttpOnly cookies; refresh requests share one in-flight promise so React Strict Mode and parallel requests do not replay a rotating token. The backend remains the authority for authentication, ownership, role checks, quota, publication and payment status.

Uploads follow the existing reserve/presign → storage PUT → complete flow. JPG, PNG and WebP are accepted, up to 25 MB per file and 20 files per batch. The guest allowance comes from the session response. Retries reuse the same batch idempotency key. Curation is limited by the event edition; incomplete blocks are hidden by the backend. Checkout redirects to the URL returned by bKash, and the result page fetches the subscription instead of trusting the browser's status query.

New reserved backend slugs (`templates`, `preview`, `verify`) prevent public event addresses from colliding with frontend routes.

## Design implementation

Source: Figma file `friKskIddMG4KCxc4Zh6pq`.

- Minimal Edit: cream paper, Instrument Serif and Inter; responsive frames 3:6, 3:107, 3:289, 3:460, 3:532, 3:1029 and 5:5.
- Premiere: dark cinematic palette; frames 6:6, 6:592 and 6:701.
- Host workspace: Playfair Display, Outfit, soft grey surfaces and purple accents from the onboarding/dashboard frames in section 15.
- Admin, authentication recovery states and Keepsake layouts extend these foundations. The design's placeholder LEVELSET branding is replaced with SNAPNKEEP.

Exported image/SVG assets are stored locally under `public/figma`; `src/lib/figma-assets.json` maps source nodes and asset names. No temporary Figma URLs are used at runtime. `src/components/previews` preserves the sample Figma compositions with scoped plain CSS. Published event websites use the responsive, data-driven block renderer in `src/components/gallery.tsx`; they never substitute sample images for host photographs. Fonts are loaded from Google Fonts with system fallbacks.

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright tests use controlled API responses matching backend contracts. They cover registration, role guards, event creation, moderation, ordered curation, closed guest links, upload retries, payment status verification, viewer keyboard controls, admin plan submission and responsive asset/overflow checks. Tests do not create live accounts, send SMS, charge bKash, or modify your database.

A final live acceptance pass requires your configured backend/database, a host/admin account, and working SMS, storage and bKash credentials (or the backend's mock modes). Backend services were not started or reconfigured as part of the frontend implementation.
