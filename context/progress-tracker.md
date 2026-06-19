# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Foundation implementation

## Current Goal

- Prepare the next spec-driven feature unit.

## Completed

- `01-design-system`: shadcn/ui configured; Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea added; `lucide-react` installed; `lib/utils.ts` `cn()` helper created; Ghost AI dark theme tokens wired into `globals.css`.
- `02-editor`: editor navbar, floating project sidebar, and reusable dialog content pattern implemented without mounting them into an app route yet.
- `03-auth`: Clerk provider, token-based dark appearance, sign-in/sign-up pages, protected-first `proxy.ts`, root redirects, and editor navbar `UserButton` implemented.
- `03-auth` UI refinement: auth pages now use an equal two-panel desktop layout, grey surface left brand panel, screenshot-inspired feature icon rows, and Geist-aligned Clerk form styling.
- `03-auth` routing fix: `/editor` route shell exists, `/` uses Clerk auth state for spec-defined redirects, and non-public routes use Clerk middleware protection.
- `03-auth` VPN proxy fix: Clerk browser traffic now uses same-origin `/__clerk` proxy routing, and server-side fetch can use Undici's environment proxy dispatcher.
- `03-auth` Clerk proxy stabilization: `/__clerk` Frontend API forwarding now uses a dedicated Node route handler instead of middleware-level forwarding, with explicit server-side Clerk key resolution and Next's escaped underscore route segment.
- `03-auth` Clerk handshake fix: `/__clerk` is excluded from Clerk middleware entirely so the route handler exclusively owns Clerk proxied asset/API/handshake traffic.
- `03-auth` Clerk origin configuration: the Clerk development instance now allows `http://localhost:3000`, resolving the remaining local host attribution gap.
- `03-auth` Clerk forwarded-header fix: the `/__clerk` route strips local forwarding metadata before calling the Clerk instance, resolving `400 host_invalid` on the development-browser handshake.
- `03-auth` Clerk proxy timeout mitigation: server-side Clerk proxying now uses a shorter configurable corporate-proxy connect timeout and retries idempotent no-body Clerk proxy requests after transient connect timeouts.
- `03-auth` Clerk asset performance fix: Clerk JS/UI asset versions are pinned locally and `/__clerk` major-version asset aliases redirect to the pinned versions without an external Clerk lookup.
- `03-auth` Clerk UI local asset fix: `/__clerk` now serves installed `@clerk/ui` browser assets from `node_modules` so sign-in UI chunks do not traverse the VPN proxy.
- `03-auth` Clerk networkless handshake fix: Clerk middleware now receives `CLERK_JWT_KEY`, avoiding remote JWKS fetches while resolving development-browser handshake tokens.
- `03-auth` Clerk proxy-agent fallback: idempotent `/__clerk` Frontend API GETs now use `https-proxy-agent` when proxy env vars are set, avoiding Undici proxy connect timeouts in the VPN environment.
- `03-auth` Clerk proxy body forwarding: `/__clerk` now buffers proxied request bodies and uses the `https-proxy-agent` path for POST/PATCH/PUT/DELETE requests as well as GETs when proxy env vars are set.
- `03-auth` Clerk local runtime assets: matching `@clerk/clerk-js@6.17.0` and `@clerk/ui@1.17.0` packages are installed and `/__clerk` serves both package asset families locally.
- `03-auth` sign-out redirect fix: ClerkProvider now sends completed sign-outs directly to `/sign-in` instead of relying on a transient `/` redirect.
- `03-auth` Clerk proxy cookie preservation fix: `/__clerk` now preserves multi-value upstream response headers, including separate `Set-Cookie` headers, when returning proxied Clerk API responses.

## In Progress

- None yet.

## Next Up

- Select the next feature spec to implement.

## Open Questions

- None.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- 2026-06-09: Started `01-design-system` implementation.
- 2026-06-09: Installed shadcn/ui primitives, added `lucide-react`, created `lib/utils.ts`, and replaced default light theme variables with the Ghost AI dark token map.
- 2026-06-09: Verification passed with `npm run lint` and `npm run build`. The first build attempt failed under sandboxed network because `next/font/google` could not fetch Geist assets; the approved rerun succeeded.
- 2026-06-10: Started `02-editor` implementation for the editor navbar, floating project sidebar, and reusable dialog pattern.
- 2026-06-10: Added `components/editor/editor-navbar.tsx`, `components/editor/project-sidebar.tsx`, and `components/editor/editor-dialog-pattern.tsx`.
- 2026-06-10: Removed the extra editor shell route wiring so `02-editor` only leaves the requested reusable components in place.
- 2026-06-10: Verification passed with `npm run lint` and `npx tsc --noEmit`. `npm run build` was attempted twice but failed before code validation because `next/font/google` could not fetch Geist assets from Google Fonts.
- 2026-06-10: Tightened `ProjectSidebar` close behavior by requiring `onClose` when rendering the always-visible close button.
- 2026-06-10: Started `03-auth` implementation from `context/feature-specs/03-auth.md`.
- 2026-06-10: Added Clerk provider wiring, protected-first `proxy.ts`, sign-in/sign-up pages, root auth redirects, and editor navbar `UserButton` for `03-auth`.
- 2026-06-10: Installed `@clerk/ui` for Clerk's `dark` theme and CSS-variable appearance overrides.
- 2026-06-10: Verification passed with `npm run lint` and `npm run build`.
- 2026-06-10: Runtime route check passed against `npm run start`: `/` redirects to `/sign-in`, `/sign-in` and `/sign-up` return 200, and `/editor` redirects signed-out users to `/sign-in?redirect_url=...`.
- 2026-06-10: `npm run dev` was attempted after restarting a stale server, but Next dev hit `EMFILE: too many open files, watch`; the broken dev process was stopped and the built app was served with `npm run start` for local verification.
- 2026-06-11: Started `03-auth` UI refinement from the provided screenshot: equal split layout, differentiated left panel, and tighter font alignment with UI guidelines.
- 2026-06-11: Updated the auth shell to a 50/50 desktop split with a grey surface left brand panel, screenshot-inspired copy hierarchy, and compact feature rows.
- 2026-06-11: Tightened Clerk appearance overrides so the built-in auth card, buttons, inputs, labels, and footer use Geist and existing CSS variable tokens.
- 2026-06-11: Verification passed with `npm run lint` and `npx tsc --noEmit`. `npm run build` was attempted with and without approved network access but failed before code validation because `next/font/google` could not fetch Geist assets from Google Fonts.
- 2026-06-11: Started `npm run dev` with approved local port access and verified `/sign-in` and `/sign-up` return 200 while `/` redirects to `/sign-in`.
- 2026-06-11: Adjusted the auth left panel from cyan-dim to the grey surface token and added compact Lucide icon tiles to the feature rows to better match the provided screenshot.
- 2026-06-11: Verification passed for the icon/color auth UI adjustment with `npm run lint` and `npx tsc --noEmit`.
- 2026-06-11: Started investigating slow auth routing after sign-up; request logs showed `proxy.ts` spending about 55 seconds per request, and `/editor` had no route file yet.
- 2026-06-11: Added a minimal `/editor` route shell using the existing editor navbar/sidebar components.
- 2026-06-11: Changed root redirects and page-route proxy protection to use a local Clerk session-cookie presence check, while keeping Clerk's full middleware protection for API/TRPC routes to avoid slow Clerk handshakes on public page requests.
- 2026-06-11: Verification passed with `npm run lint` and `npx tsc --noEmit`; local route checks showed `/sign-in` at about 46ms, signed-out `/editor` redirect at about 59ms, and `/editor` rendering 200 with a session cookie.
- 2026-06-11: Restored spec-exact `/` redirects by using Clerk `auth().isAuthenticated` in `app/page.tsx` and reverting non-public route protection from session-cookie presence back to Clerk `auth.protect()`.
- 2026-06-16: Implemented the documented Clerk VPN proxy fix: added `undici`, Node-only instrumentation for environment proxy dispatch, Clerk `frontendApiProxy`, `/__clerk` proxy matching, and ClerkProvider `proxyUrl`.
- 2026-06-16: Verification passed with `npm run lint`, `npx tsc --noEmit`, proxied Node fetch to Clerk, `npm run build` with proxy env vars, and local dev route checks for `/`, `/sign-in`, `/editor`, and `/__clerk` Clerk JS proxying.
- 2026-06-17: Stabilized the Clerk VPN proxy path by moving `/__clerk` forwarding from `proxy.ts` to `app/%5F%5Fclerk/[[...path]]/route.ts`, keeping `/__clerk` public in auth middleware, and adding a server-side `CLERK_PUBLISHABLE_KEY` alias for consistent instance attribution.
- 2026-06-17: Verification passed with `npm run lint`, `npx tsc --noEmit`, `/sign-in` returning 200, and proxied Clerk JS/UI assets returning 200 JavaScript through `/__clerk` after Clerk version redirects.
- 2026-06-17: After browser testing still showed Clerk handshake `host_invalid`, updated `proxy.ts` to exclude `/__clerk` from Clerk middleware completely instead of only treating it as public.
- 2026-06-17: Clerk Backend API inspection showed the development instance had `allowedOrigins: null`; updated the Clerk instance to include `http://localhost:3000` and verified the allowed origin is now present.
- 2026-06-17: Confirmed Clerk rejected the proxied handshake when Next's `x-forwarded-host: localhost:3000` and `x-forwarded-proto: http` reached the instance, then updated the `/__clerk` route handler to strip forwarded proxy metadata.
- 2026-06-17: Verification passed with `npm run lint`, `npx tsc --noEmit`, `npm run build` with proxy env vars, signed-out redirects for `/` and `/editor`, and `/__clerk` handshake/client/environment/JS/UI proxy checks returning expected `307` or `200` responses.
- 2026-06-17: Investigated slow sign-in after the Clerk host fix; logs showed transient `UND_ERR_CONNECT_TIMEOUT` failures to the corporate proxy's port 80 endpoint before successful retries.
- 2026-06-17: Added a default 3000ms Undici proxy connector timeout, `PROXY_CONNECT_TIMEOUT_MS` override support, and a narrow retry for idempotent no-body `/__clerk` proxy requests.
- 2026-06-17: Verification passed with `npm run lint`, `npx tsc --noEmit`, `/sign-in` returning 200, `/__clerk` handshake returning 307, and Clerk JS/UI assets resolving through the local proxy without a visible 500.
- 2026-06-17: Analyzed the attached HAR and found the remaining sign-in delay came from Clerk's unversioned `@6` and `@1` asset alias resolution through the VPN proxy.
- 2026-06-17: Pinned `NEXT_PUBLIC_CLERK_JS_VERSION=6.17.0` and `NEXT_PUBLIC_CLERK_UI_VERSION=1.17.0`, then added local `/__clerk` redirects from the major aliases to those pinned versions.
- 2026-06-17: Verification passed with `npm run lint`, `npx tsc --noEmit`, `npm run build` with proxy env vars, direct versioned Clerk asset URLs in `/sign-in`, and warm local alias redirects completing in tens of milliseconds.
- 2026-06-17: Follow-up logs showed versioned Clerk UI split chunks were still slow because they were fetched remotely through `/__clerk` and the VPN proxy.
- 2026-06-17: Pinned `NEXT_PUBLIC_CLERK_UI_VERSION=1.15.1` to match the installed `@clerk/ui` package and served `/__clerk/npm/@clerk/ui@1.15.1/dist/*.js` from `node_modules/@clerk/ui/dist`.
- 2026-06-17: Verification passed with `npm run lint`, `npx tsc --noEmit`, `npm run build`, `/sign-in` returning 200 on a production verification server, and representative local Clerk UI chunks returning in about 4ms after the entry bundle.
- 2026-06-17: Latest HAR showed the dominant remaining delay was `/?__clerk_handshake=...`, which took about 8.7s before redirecting back to `/`.
- 2026-06-17: Added `CLERK_JWT_KEY` to `.env.local` from the Clerk instance JWKS public key and passed `jwtKey` into `clerkMiddleware` so handshake JWT verification is networkless.
- 2026-06-17: Verification passed with `npm run lint`, `npx tsc --noEmit`, and direct signature verification of the latest HAR handshake token against the local public key. `npm run build` was blocked by Google font downloads, not auth code.
- 2026-06-18: Private-window retest showed `/__clerk/v1/client/handshake` failing with Undici `UND_ERR_CONNECT_TIMEOUT`, while `curl -x` to the same Clerk URL succeeded through the corporate proxy.
- 2026-06-18: Added `https-proxy-agent` and routed idempotent bodyless `/__clerk` HTTPS requests through Node `https.request` with a forced-IPv4 proxy-agent fallback when proxy env vars are set.
- 2026-06-18: Verification passed with `npm run lint`, `npx tsc --noEmit`, and direct `HttpsProxyAgent` checks for Clerk handshake, Clerk JS, and `/v1/client` through the corporate proxy.
- 2026-06-18: Latest HAR showed `/__clerk/v1/environment` still used the Undici path and failed after several seconds, while Clerk JS remained remote and slow. Attempted to install matching local `@clerk/ui@1.17.0` and `@clerk/clerk-js@6.17.0`, but npm registry access timed out on the current network path.
- 2026-06-18: Updated `/__clerk` to buffer request bodies once, use `https.request` plus `HttpsProxyAgent` for all proxied Clerk HTTPS methods when proxy env vars are set, and keep a `Blob` fallback body for standard `fetch` if the Node proxy path is unavailable.
- 2026-06-18: Verification passed with `npm run lint` and `npx tsc --noEmit` for the Clerk proxy body-forwarding fix.
- 2026-06-18: After disconnecting from VPN, installed `@clerk/ui@1.17.0` and `@clerk/clerk-js@6.17.0`, set `NEXT_PUBLIC_CLERK_UI_VERSION=1.17.0`, and generalized `/__clerk` local asset serving to cover both `@clerk/clerk-js` and `@clerk/ui`.
- 2026-06-18: Verification passed with `npm run lint`, `npx tsc --noEmit`, package version checks for Clerk UI/JS, and local file checks for `clerk.browser.js`, `ui.browser.js`, and the 1.17.0 sign-in UI chunk.
- 2026-06-18: Production verification passed with `npm run build` outside VPN. Runtime smoke testing on a temporary production server confirmed `/` redirects to `/sign-in`, `/sign-in` returns 200, Clerk major-version aliases redirect to pinned local versions, and versioned Clerk JS/UI/sign-in chunk assets return 200 with `x-clerk-local-asset`.
- 2026-06-18: After sign-out testing showed a transient `GET / 200` before `/sign-in`, set `afterSignOutUrl` and `afterMultiSessionSingleSignOutUrl` on `ClerkProvider` to `/sign-in`.
- 2026-06-18: Verification passed with `npm run lint`, `npx tsc --noEmit`, `npm run build`, and a temporary production server smoke test confirming signed-out `/` redirects to `/sign-in` and `/sign-in` returns 200.
- 2026-06-19: Applied the Clerk proxy response-header review fix: upstream `Set-Cookie` headers are extracted with `Headers.getSetCookie()` when available and appended individually, while non-stripped response headers use `append()` instead of `set()`.
- 2026-06-19: Verification passed with `npm run lint` and `npx tsc --noEmit`. `npm run build` was attempted but failed before application validation because `next/font/google` could not fetch Geist and Geist Mono from Google Fonts.
