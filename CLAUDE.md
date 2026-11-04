# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is pnpm (Node 22 in CI).

```bash
pnpm dev                    # Next dev server on :3000
pnpm lint                   # ESLint for the whole repo
pnpm eslint path/to/file    # ESLint for one file
pnpm typecheck              # next typegen && tsc --noEmit
pnpm build                  # Next production build
pnpm preview                # OpenNext build, then run locally in the Workers runtime
pnpm deploy                 # OpenNext build, then deploy to Cloudflare Workers
pnpm cf-typegen             # Regenerate cloudflare-env.d.ts

pnpm api:sync               # Copy ../lentes-api/api/openapi.yaml here, then regenerate the client
pnpm api:gen                # Regenerate the client from openapi/openapi.yaml
pnpm emails:sync            # Export emails/ to HTML and copy into ../lentes-api/internal/email/templates
```

There is no test runner, so no unit or single-test command exists. CI runs `lint`, `typecheck` and `build`.

## Architecture

Storefront for prescription contact lenses and glasses frames in Mexico (Spanish UI, `es-MX`, MXN). It runs on Next.js 16 with the App Router, deployed to Cloudflare Workers through OpenNext.

This repo holds no business logic and no database access. The Go backend `lentes-api` owns the rules and data, and `lentes-admin` is the separate admin app. The `api:sync` and `emails:sync` scripts expect `lentes-api` as a sibling directory.

### API contract and client

- `openapi/openapi.yaml` is a copy. The source of truth is `lentes-api/api/openapi.yaml`, so contract changes start there and arrive through `pnpm api:sync`.
- `lib/api/generated/` is Orval output (React Query hooks plus plain functions). Do not edit it by hand.
- Every generated call goes through `lib/api/mutator.ts`, which has behavior callers rely on:
  - It does not throw on 4xx or 5xx. Calls return `{ data, status, headers }`, so check `status` before trusting `data`. Errors arrive as `application/problem+json`; their Spanish `detail` is shown to customers.
  - It still throws on network or JSON parse failures. Server loaders such as `lib/storefront.ts` catch these and return `null`, so an API outage does not break the page.
  - It attaches the Supabase bearer token only in the browser. Server code must pass `Authorization` explicitly, because the mutator cannot import `next/headers`.
  - It stores `cart_token` from response bodies in a cookie and sends it back as `X-Cart-Token`. This is how anonymous carts work.
  - It strips the `/v1` prefix from generated paths because `NEXT_PUBLIC_API_URL` already includes `/v1`.

Public catalog pages fetch in server components with plain generated functions. Account, cart and checkout data is fetched client-side with generated hooks and functions in `components/tienda` and `components/cuenta`.

### Auth and routing

- `proxy.ts` (Next 16's replacement for `middleware.ts`) calls `lib/supabase/proxy.ts`. It refreshes the Supabase session and redirects unauthenticated requests for `/cuenta`, `/checkout` and `/recompra` to `/login?next=...`. Add new private routes to its `PROTECTED` list. `lib/safe-next.ts` guards against open redirects: `safeNext` for `next` targets, `isInternalHref` for admin-managed banner links.
- Route groups are `(tienda)`, `(auth)` and `(cuenta)`. The root layout renders the header and footer for all of them.
- Products have two URL trees by category: `/lentes/[slug]` for `contact_lens` and `/armazones/[slug]` for frames. Use `productHref` from `lib/format.ts` to build links; `/lentes/{frame-slug}` redirects permanently to the frame URL.
- `lib/navigation.ts` builds the header and mega menu from API facets, hiding values that have no products.

### Environment

All variables are `NEXT_PUBLIC_*`, listed in `.env.example`, and read through `lib/env.ts`. Add new ones there as literal `process.env.NEXT_PUBLIC_X` reads so Next can inline them. Without configuration the app still runs: the API defaults to `http://localhost:8080/v1`, and Sentry and PostHog stay off. Without Supabase, protected routes always redirect to login. `.dev.vars` (from `.dev.vars.example`) is for the Workers runtime.

### Security headers

`lib/security-headers.ts` builds the CSP at build time from the `NEXT_PUBLIC_*` values and is applied in `next.config.ts`. A new external origin (script, API, image, frame) must be added there, and a changed domain requires a rebuild. The CSP deliberately has no nonce, to keep static rendering and ISR for the catalog; see `docs/SECURITY.md` before changing that.

### Privacy

Prescriptions and addresses are personal and health data. Sensitive sections carry the `ph-no-capture` class so PostHog session recording never captures them, and new screens showing this data need it too.

### Emails

`emails/` holds React Email templates that export to static HTML for the Go backend to send. Values are Go `html/template` placeholders from `emails/components/tpl.ts` (`v`, `raw`), not React props. Run `pnpm emails:sync` after changing a template.

### Texts

Static UI text lives in `messages/es-MX.json` and is read through i18next, the same library as `lentes-admin`. Use `t("key")` from `lib/i18n.ts` in server and client components; keys are type-checked. For a link or emphasis inside a sentence, put a tag in the message and render it with `rich` from `lib/rich.tsx`. `emails/` stays outside this file.

### UI and brand

- Components in `components/ui` are shadcn (`base-nova` style, on `@base-ui/react`). Tailwind v4 is configured in `app/globals.css`, with no JS config. Brand tokens live there too.
- The brand name "Pupila" is a working name, set in `messages/es-MX.json`. Use `BRAND` from `lib/brand.ts` or the `{{brand}}` message variable rather than hardcoding it.
- Optical values (sphere, cylinder, axis, base curve, diameter) use the `.optic` class.
- The storefront's visual reference is https://www.glassesusa.com. Apply its language to new storefront screens:
  - Dark promo bar with centered white text.
  - White single-row header: logo, plain text links, gray pill search on the right, icons and a labeled account link.
  - Full-width mega menu: link columns on the left, visual cards on the right.
  - Full-width hero carousel: background image, large white text, white pill buttons, circular side arrows.
  - White pill trust strip overlapping the hero's bottom edge, followed by a row of brand pills.
- Keep our own brand (name, logo, fonts and tokens). Never copy GlassesUSA logos or images.
- Copy may only promise what the store actually does. `docs/BRAND.md` lists brand-book features deliberately left out, such as subscriptions and express delivery. Do not borrow GlassesUSA claims such as free shipping, home try-on, physical stores or discounts while the business does not offer them.

## Project docs

- `docs/SPEC.md`: original technical spec for the whole product.
- `specs/SPEC-NN-*.md`: feature specs with lifecycle status. Recent features were specified first, using the `bambu-spec-define` and `bambu-spec-implement` skills.
- `docs/API-GAPS.md`: contract decisions between web and API, and what has not yet been verified end to end.
- `docs/BRAND.md` and `docs/SECURITY.md`: implemented brand system and security decisions.

## Conventions

- Code comments, docs and specs are written in Spanish. Commit messages are Conventional Commits in English.
- Prices are integer cents; format them with the helpers in `lib/format.ts`.
- `.claude/skills/*` are symlinks to `.agents/skills/*`, installed from `Bambu-Developers/skills` and pinned in `skills-lock.json`.
