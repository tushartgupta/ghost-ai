## Issues

#### 1. When i try to perform login, the browser just gets hung for long time when calling this URL: https://merry-alien-30.clerk.accounts.dev .I usually am connected to VPN, and access to this is allowed only via proxy. My usual proxy is www-proxy.us.oracle.com at port 80. No user cred required.

## Analysis

The login hang is a network routing issue, not a Clerk UI rendering issue.

Clerk traffic currently tries to reach the development Frontend API host directly:

- `https://merry-alien-30.clerk.accounts.dev`

In the VPN environment, direct access to this host times out. The same host is reachable through the corporate proxy:

- `http://www-proxy.us.oracle.com:80`

This affects two separate request paths:

1. Browser to Clerk Frontend API / Clerk JS
   - The sign-in/sign-up UI loads Clerk browser runtime and account resources.
   - If the browser tries to call `merry-alien-30.clerk.accounts.dev` directly, the UI can appear to hang.

2. Next.js server/proxy to Clerk
   - `proxy.ts`, `auth()`, and `auth.protect()` need to resolve Clerk auth state.
   - The current auth implementation is spec-compliant, but it puts Clerk server auth back in the request path for `/` and protected routes.
   - Node `fetch` did not successfully use `HTTP_PROXY` / `HTTPS_PROXY` automatically in the local runtime test, so an explicit Node fetch proxy setup is likely required.

Current auth behavior should not be weakened to avoid this issue:

- `/` must redirect authenticated users to `/editor`.
- `/` must redirect unauthenticated users to `/sign-in`.
- Public routes remain `/`, `/sign-in`, and `/sign-up`.
- Other routes stay protected by Clerk middleware.

## Proposed Fix

Use a two-layer proxy setup so both browser-side and server-side Clerk traffic can work behind VPN.

1. Enable Clerk's same-origin Frontend API proxy.
   - Configure Clerk so the browser calls local app paths such as `/__clerk/...` instead of calling `merry-alien-30.clerk.accounts.dev` directly.
   - Add `frontendApiProxy: { enabled: true }` to `clerkMiddleware`.
   - Ensure `proxy.ts` matches `/__clerk(.*)`, because Clerk's proxied JS paths can include file extensions that the current static-asset exclusion may skip.

2. Configure server-side fetch traffic to use the corporate proxy.
   - Add an explicit `undici` dependency.
   - Add a root `instrumentation.ts`.
   - Add a Node-only instrumentation module that installs an Undici `ProxyAgent` when `HTTP_PROXY` or `HTTPS_PROXY` is set.
   - This should cover Clerk server-side auth calls and Clerk's same-origin Frontend API proxy fetches.

3. Keep corporate proxy details environment-driven.
   - Do not hardcode Oracle proxy details into application source.
   - Use local environment variables when running development:
     - `HTTP_PROXY=http://www-proxy.us.oracle.com:80`
     - `HTTPS_PROXY=http://www-proxy.us.oracle.com:80`
   - Use Clerk proxy config such as `NEXT_PUBLIC_CLERK_PROXY_URL=/__clerk` or an equivalent `ClerkProvider`/middleware configuration.

4. Verification after implementation.
   - Run `npm run lint`.
   - Run `npx tsc --noEmit`.
   - Start the dev server with proxy environment variables.
   - Verify `/`, `/sign-in`, and `/editor`.
   - In browser DevTools, confirm Clerk browser calls are routed through `/__clerk/...` instead of directly to `merry-alien-30.clerk.accounts.dev`.

## Implementation

Implemented the documented two-layer proxy setup.

- Added `undici` as a direct dependency.
- Added root `instrumentation.ts`.
- Added `instrumentation-node.ts` to install Undici's environment proxy dispatcher when `HTTP_PROXY` or `HTTPS_PROXY` is set.
- Enabled Clerk's same-origin Frontend API proxy in `proxy.ts`.
- Added `/__clerk(.*)` to the proxy matcher so proxied Clerk JS/assets are not skipped by the static-asset exclusion.
- Configured `ClerkProvider` with `proxyUrl="/__clerk"` so browser-side Clerk traffic uses the same-origin proxy path.

Local development still needs the corporate proxy env vars when running the server:

- `HTTP_PROXY=http://www-proxy.us.oracle.com:80`
- `HTTPS_PROXY=http://www-proxy.us.oracle.com:80`

Verification completed:

- `npm run lint`
- `npx tsc --noEmit`
- Node fetch to `https://merry-alien-30.clerk.accounts.dev` succeeds through Undici `EnvHttpProxyAgent` when `HTTP_PROXY` and `HTTPS_PROXY` are set.
- `npm run build` passes when run with the proxy environment variables.
- Local dev route checks with proxy environment variables:
  - `/` returns `307` to `/sign-in` in signed-out state.
  - `/sign-in` returns `200`.
  - `/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js` resolves through the local `/__clerk` proxy and returns `200` after Clerk's version redirect.
  - `/editor` with a browser-like document request redirects to `/__clerk/v1/client/handshake...` for Clerk's development-browser handshake; plain curl without the browser handshake can receive Clerk's signed-out `404`.

Browser verification remains pending:

- Confirm `/`, `/sign-in`, and `/editor`.
- Confirm browser Clerk requests go through `/__clerk/...`.

#### 2. Post above fix, when i started the app with command `HTTP_PROXY=http://www-proxy.us.oracle.com:80 HTTPS_PROXY=http://www-proxy.us.oracle.com:80 NO_PROXY=localhost,127.0.0.1 npm run dev` but when tried to open the app the sign-in page did not loaded and console showed below error:

Console Error
ui.browser.js:1
Failed to load resource: the server responded with a status of 502 (Bad Gateway)

clerk.browser.js:1
Failed to load resource: the server responded with a status of 502 (Bad Gateway)
loadScript.ts:51
GET http://localhost:3000/**clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js net::ERR_ABORTED 502 (Bad Gateway)
clerk.browser.js:12 Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits and should not be used when deploying your application to production. Learn more: https://clerk.com/docs/deployments/overview
clerk.browser.js:18
POST http://localhost:3000/**clerk/v1/environment?**clerk_api_version=2026-05-12…ersion=6.17.0&\_method=PATCH&**clerk_db_jwt=dvb_3ATQUxpICmhvlIWOAaf43wC9lc6 400 (Bad Request)
clerk.browser.js:18
GET http://localhost:3000/**clerk/v1/client?**clerk_api_version=2026-05-12&\_clerk_js_version=6.17.0&\_\_clerk_db_jwt=dvb_3ATQUxpICmhvlIWOAaf43wC9lc6 400 (Bad Request)
intercept-console-error.ts:48 e: We were unable to attribute this request to an instance running on Clerk. Make sure that your Clerk Publishable Key is correct.
at t4.\_baseFetch (clerk.browser.js:18:171)
at async t2.execute (clerk.browser.js:17:6743)
at async ra.\_baseGet (clerk.browser.js:18:497)
at async Promise.all (index 1)
at async #eg (clerk.browser.js:18:216666)
at async sn.load (clerk.browser.js:18:173984)

## Analysis

This is no longer the original slow VPN timeout.

The browser is correctly attempting to use the same-origin Clerk proxy path:

- `/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
- `/__clerk/npm/@clerk/ui@1/dist/ui.browser.js`
- `/__clerk/v1/environment`
- `/__clerk/v1/client`

The failure now has two parts:

1. `502 Bad Gateway` on Clerk JS/UI assets
   - The app matched `/__clerk/...` and attempted to proxy to Clerk.
   - The server-side proxy fetch failed before returning the Clerk asset.
   - This is a server-side proxy reliability problem, not an auth page rendering problem.

2. `400 Bad Request` from `/__clerk/v1/environment` and `/__clerk/v1/client`
   - The proxied request reached Clerk.
   - Clerk rejected the request with: `We were unable to attribute this request to an instance running on Clerk`.
   - That points to instance attribution/key configuration, or to the proxy not consistently forwarding the metadata Clerk expects.

The current implementation put Clerk Frontend API forwarding inside `proxy.ts` via `frontendApiProxy`. In Next.js 16, `proxy.ts` is pre-route request logic. It works for auth checks and redirects, but it is not the best ownership boundary for repeated asset/API forwarding.

Also, `.env.local` had `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, but did not have `CLERK_PUBLISHABLE_KEY`. Clerk Next middleware reads the public key from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, while Clerk's lower-level backend proxy fallback expects `CLERK_PUBLISHABLE_KEY` if the key is not passed explicitly.

## Proposed Fix

Move Clerk Frontend API proxying out of `proxy.ts` and into a focused App Router route handler.

1. Add an App Router route handler for `/__clerk/[[...path]]`.
   - Use Clerk's official `createFrontendApiProxyHandlers()`.
   - Run it in the Node runtime.
   - Pass `proxyPath: "/__clerk"`.
   - Pass the publishable key and secret key explicitly.
   - Use Next's `%5F` folder escape because folders beginning with `_` are private in App Router.

2. Simplify `proxy.ts`.
   - Remove `frontendApiProxy`.
   - Keep `/__clerk(.*)` public so auth protection never blocks Clerk runtime/API calls.
   - Keep `proxyUrl: "/__clerk"` so Clerk server auth remains aware of the proxy URL.

3. Add a local backend publishable key alias.
   - Set `CLERK_PUBLISHABLE_KEY` to the same value as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
   - This makes server-side Clerk proxy code resolve the same instance key explicitly.

4. Keep auth behavior unchanged.
   - `/` still redirects authenticated users to `/editor`.
   - `/` still redirects unauthenticated users to `/sign-in`.
   - Public routes remain `/`, `/sign-in`, `/sign-up`, and `/__clerk`.
   - Other routes remain protected by Clerk middleware.

## Implementation

Implemented the focused route-handler proxy ownership.

- Added `app/%5F%5Fclerk/[[...path]]/route.ts`, which maps to `/__clerk/[[...path]]`.
- The route uses `createFrontendApiProxyHandlers()` with `proxyPath: "/__clerk"`.
- The route runs in the Node runtime.
- The route passes Clerk publishable and secret keys explicitly.
- Removed `frontendApiProxy` from `proxy.ts`.
- Kept `/__clerk(.*)` public in `proxy.ts`.
- Kept `ClerkProvider proxyUrl="/__clerk"` unchanged.
- Added `CLERK_PUBLISHABLE_KEY` to `.env.local`, mirroring `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Verified and corrected the route folder naming after Next returned `404` for `app/__clerk/...`; App Router treats underscore-prefixed folders as private.

Verification completed:

- `npm run lint`
- `npx tsc --noEmit`
- Started `npm run dev` with:
  - `HTTP_PROXY=http://www-proxy.us.oracle.com:80`
  - `HTTPS_PROXY=http://www-proxy.us.oracle.com:80`
  - `NO_PROXY=localhost,127.0.0.1,::1`
- `/sign-in` returned `200`.
- `/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js` returned `307` to Clerk's resolved version and then `200 application/javascript`.
- `/__clerk/npm/@clerk/ui@1/dist/ui.browser.js` returned `307` to Clerk's resolved version and then `200 application/javascript`.
- Confirmed the generated sign-in HTML contains:
  - `src="/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js"`
  - `data-clerk-publishable-key`
  - `data-clerk-proxy-url="/__clerk"`

Follow-up after browser verification:

- Loading the home page still produced Clerk's handshake loop warning and `400 host_invalid` from `/__clerk/v1/client/handshake`.
- The key pair was refreshed from Clerk Dashboard, so the next root cause was middleware ownership.
- The route handler owned `/__clerk`, but `proxy.ts` still matched `/__clerk(.*)`.
- That meant Clerk middleware still ran on Clerk's own proxied asset/API/handshake requests and could trigger Clerk auth/handshake behavior before the dedicated route handler response completed.

Follow-up implementation:

- Removed `/__clerk(.*)` from the Clerk middleware matcher.
- Removed `/__clerk(.*)` from the public route matcher because it no longer enters middleware.
- Updated the main matcher negative lookahead to exclude `__clerk`.
- `/__clerk` is now exclusively owned by `app/%5F%5Fclerk/[[...path]]/route.ts`.

Remaining browser verification after this follow-up:

- Open `/sign-in` in the browser and confirm the Clerk form renders.
- In DevTools Network, confirm `/__clerk/v1/environment` and `/__clerk/v1/client` do not return `400 host_invalid` during the real browser Clerk flow.

Additional follow-up after repeated `host_invalid`:

- The route/middleware ownership issue was fixed, but the proxied Clerk development-browser handshake still returned `400 host_invalid`.
- Clerk Backend API inspection showed the development instance had `allowedOrigins: null`.
- Updated the Clerk development instance configuration so `allowedOrigins` includes `http://localhost:3000`.
- Verified the instance now reports:
  - `allowedOrigins: ["http://localhost:3000"]`

Required local retest:

- Restart `npm run dev` so all `.env.local` and proxy changes are loaded cleanly.
- Clear site data for `localhost:3000` or use a fresh private window.
- Load `/` or `/sign-in` again and confirm the Clerk handshake no longer returns `400 host_invalid`.

Manual curl caveat:

- A direct curl to `/__clerk/v1/environment` can still return `400 host_invalid` because it is not a real browser Clerk development flow and does not include the same dev-browser state/origin behavior as Clerk's runtime.
- If the browser still returns `400 host_invalid` after this fix, the next suspect is a Clerk dashboard or key-pair issue: the publishable key and secret key must belong to the same Clerk instance, and the local origin/proxy URL must be accepted by that development instance.

Final root cause:

- The local `/__clerk` route handler was forwarding Next's local proxy metadata to the Clerk instance.
- In particular, `x-forwarded-host: localhost:3000` and `x-forwarded-proto: http` caused Clerk's Frontend API to reject the request with `400 host_invalid`.
- Direct verification against `https://merry-alien-30.clerk.accounts.dev/v1/client/handshake` confirmed the same request succeeds with `307` when those headers are absent and fails with `400 host_invalid` when those forwarded headers are present.

Final implementation:

- Updated `app/%5F%5Fclerk/[[...path]]/route.ts` so the custom Clerk Frontend API proxy strips local forwarding metadata before calling the Clerk instance:
  - `forwarded`
  - `x-forwarded-for`
  - `x-forwarded-host`
  - `x-forwarded-port`
  - `x-forwarded-prefix`
  - `x-forwarded-proto`
  - `x-real-ip`
- Kept `host` stripped as before.
- Kept response hop-by-hop and body-length/encoding headers stripped so the streamed response is owned by the local Next response.

Final verification:

- Cleaned up a stale Next dev process and restarted the app on `http://localhost:3000` with:
  - `HTTP_PROXY=http://www-proxy.us.oracle.com:80`
  - `HTTPS_PROXY=http://www-proxy.us.oracle.com:80`
  - `NO_PROXY=localhost,127.0.0.1,::1`
- `/__clerk/v1/client/handshake?...` now returns `307` with `x-clerk-instance-id` instead of `400 host_invalid`.
- `/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js` returns `307` to the resolved local `/__clerk/...@6.17.0...` URL and then `200 application/javascript`.
- `/__clerk/npm/@clerk/ui@1/dist/ui.browser.js` returns `307` to the resolved local `/__clerk/...@1.17.0...` URL and then `200 application/javascript`.
- `/__clerk/v1/client?__clerk_api_version=2025-11-10` returns `200`.
- `/__clerk/v1/environment?__clerk_api_version=2025-11-10&_clerk_js_version=6.17.0` returns `200`.
- `/` redirects signed-out users to `/sign-in`.
- `/editor` redirects signed-out users to `/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3000%2Feditor`.
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed with the proxy environment variables.

Browser automation note:

- Playwright is not installed in this repo, so browser-level automation was not run. The local HTTP checks cover the exact Clerk endpoints that previously returned `host_invalid`.

Performance follow-up:

- Browser testing after the `host_invalid` fix showed the sign-in page could still feel slow even though Clerk requests eventually succeeded.
- The remaining slow path was not Clerk attribution. It was a transient proxy connection timeout:
  - `UND_ERR_CONNECT_TIMEOUT`
  - attempted proxy addresses included `10.68.69.53:80`
  - the default timeout was `10000ms`
- After the timeout, a retry of the same Clerk path usually succeeded in about 1 second.

Performance implementation:

- Updated `instrumentation-node.ts` so Undici's `EnvHttpProxyAgent` uses a shorter proxy connector timeout.
- Default timeout is `3000ms`.
- The timeout can be overridden locally with:
  - `PROXY_CONNECT_TIMEOUT_MS=<milliseconds>`
- Added a narrow retry inside `app/%5F%5Fclerk/[[...path]]/route.ts` for idempotent no-body Clerk proxy requests:
  - `GET`
  - `HEAD`
  - `OPTIONS`
- The retry only handles `UND_ERR_CONNECT_TIMEOUT`.
- Requests with bodies are not retried to avoid replaying non-idempotent mutations.

Performance verification:

- Restarted `npm run dev` with the VPN proxy environment variables so the instrumentation change was loaded.
- `/sign-in` returned `200` in about `551ms`.
- `/__clerk/v1/client/handshake?...` returned `307` in about `330ms`.
- `/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js` returned `307`, then the resolved version returned `200`.
- `/__clerk/npm/@clerk/ui@1/dist/ui.browser.js` completed through the proxy path without a visible `500`; one run took about `5.2s`, consistent with one shortened proxy retry plus the successful Clerk response.

HAR follow-up:

- The `testrun.har` trace showed the app route was not the slow part:
  - `/sign-in` returned `200` in about `21ms`.
  - `/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js` took about `4499ms` and returned `307`.
  - `/__clerk/npm/@clerk/ui@1/dist/ui.browser.js` took about `7028ms` and returned `500`.
  - A later retry of `/__clerk/npm/@clerk/ui@1/dist/ui.browser.js` took about `1020ms` and returned `307`.
  - The resolved versioned assets, such as `@clerk/clerk-js@6.17.0` and `@clerk/ui@1.17.0`, were cached or fast after the redirect.
- Root cause: Clerk's unversioned major aliases (`@6` and `@1`) forced the local `/__clerk` proxy to call Clerk just to resolve the concrete asset version. Behind VPN, that alias lookup was slow and could hit the corporate proxy connect timeout before recovering.
- Browser console cookie warnings for `_cfuvid` and `__cf_bm` are Cloudflare cookies from Clerk's host being returned through the localhost proxy. They are noisy but not the login-screen bottleneck.
- The source-map and font preload warnings are unrelated to the Clerk auth delay.

HAR follow-up implementation:

- Added these local Clerk asset version pins to `.env.local`:
  - `NEXT_PUBLIC_CLERK_JS_VERSION=6.17.0`
  - `NEXT_PUBLIC_CLERK_UI_VERSION=1.17.0`
- Clerk's Next integration reads those environment variables and now emits versioned local asset URLs directly:
  - `/__clerk/npm/@clerk/clerk-js@6.17.0/dist/clerk.browser.js`
  - `/__clerk/npm/@clerk/ui@1.17.0/dist/ui.browser.js`
- Added a local fast redirect in `app/%5F%5Fclerk/[[...path]]/route.ts` as a backstop:
  - `/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js` redirects locally to `@6.17.0`.
  - `/__clerk/npm/@clerk/ui@1/dist/ui.browser.js` redirects locally to `@1.17.0`.
- This removes the slow external major-alias lookup from the sign-in critical path while keeping the existing same-origin Clerk proxy behavior.

HAR follow-up verification:

- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed with the proxy environment variables.
- A separate dev server was started on `http://localhost:3001` to avoid touching the existing process on port `3000`.
- `/sign-in` returned `200` in about `531ms` on the verification server.
- The generated sign-in HTML referenced the pinned versioned Clerk assets directly.
- Warm local alias checks returned fast `307` redirects:
  - `@clerk/clerk-js@6` redirected to `@6.17.0` in about `14ms`.
  - `@clerk/ui@1` redirected to `@1.17.0` in about `35ms`.
- The pinned assets returned `200` through the local proxy:
  - `@clerk/clerk-js@6.17.0`
  - `@clerk/ui@1.17.0`

Local UI follow-up:

- Browser testing after the HAR alias fix still showed slow sign-in rendering.
- The new terminal logs showed the alias lookup was gone, but every versioned Clerk UI file was still fetched remotely through `/__clerk` and the corporate proxy:
  - `/__clerk/npm/@clerk/ui@1.17.0/dist/ui.browser.js` took about `1762ms`.
  - `framework_ui_...` took about `537ms`.
  - `ui-common_ui_...` took about `756ms`.
  - `signin_ui_...` took about `1614ms`.
  - `signup_ui_...` took about `1616ms`.
  - `vendors_ui_...` took about `1861ms`.
- Root cause: the first-page sign-in flow was still dependent on multiple Clerk UI split chunks crossing the VPN proxy. The previous version pin removed the major-alias lookup but not the remote UI asset fetches.
- The repo already has `@clerk/ui` installed locally at `1.15.1`, and that package contains the browser UI bundle plus split chunks under `node_modules/@clerk/ui/dist`.

Local UI implementation:

- Changed `.env.local` to pin Clerk UI to the installed local package:
  - `NEXT_PUBLIC_CLERK_UI_VERSION=1.15.1`
- Updated `app/%5F%5Fclerk/[[...path]]/route.ts` so requests matching `/__clerk/npm/@clerk/ui@1.15.1/dist/*.js` or `*.js.map` are served from `node_modules/@clerk/ui/dist`.
- Local UI asset responses include:
  - `cache-control: public, max-age=31536000, immutable`
  - `x-clerk-local-asset: @clerk/ui`
- Clerk API calls and `@clerk/clerk-js@6.17.0` still go through the existing remote Clerk proxy path.

Local UI verification:

- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed with the proxy environment variables.
- Because Next dev only allows one active dev server per repo and port `3000` was already running, verification used `next start` on `http://localhost:3001`.
- `/sign-in` returned `200` in about `105ms`.
- The generated sign-in HTML referenced:
  - `/__clerk/npm/@clerk/clerk-js@6.17.0/dist/clerk.browser.js`
  - `/__clerk/npm/@clerk/ui@1.15.1/dist/ui.browser.js`
- Local UI asset checks returned:
  - `ui.browser.js` in about `107ms`
  - `framework_ui_678f63_1.15.1.js` in about `4ms`
  - `signin_ui_678f63_1.15.1.js` in about `4ms`
- `@clerk/clerk-js@6.17.0` still resolved through the remote proxy path and took about `2154ms`, so the remaining cold-load cost is now Clerk JS plus live Clerk API/handshake traffic rather than the UI chunk fan-out.

Networkless handshake follow-up:

- The latest `testrun.har` showed the UI chunk fix worked, but the perceived slowness moved earlier in the navigation:
  - Initial `/` returned `307` to `/__clerk/v1/client/handshake` in about `142ms`.
  - `/__clerk/v1/client/handshake?...` returned `307` in about `1796ms`.
  - `/?__clerk_handshake=...` took about `8663ms` before redirecting back to `/`.
  - The next `/` redirected to `/sign-in` in about `253ms`.
  - `/sign-in` returned `200` in about `340ms`.
- The terminal logs also confirmed the Clerk UI split chunks are now local and fast:
  - representative `@clerk/ui@1.15.1` chunks returned in about `7ms` to `23ms`.
- Root cause: resolving `/?__clerk_handshake=...` requires Clerk middleware to verify the handshake JWT. Without `CLERK_JWT_KEY`, Clerk loads the JWKS signing key from Clerk's Backend API using `CLERK_SECRET_KEY`. Behind VPN, that remote JWKS fetch can block on the corporate proxy and dominated the page load.
- Clerk's own backend types document `CLERK_JWT_KEY` as the networkless verification path.

Networkless handshake implementation:

- Fetched the Clerk instance JWKS once from `https://api.clerk.com/v1/jwks` using the existing local secret key.
- Converted the public RSA JWK to PEM and added it to `.env.local` as:
  - `CLERK_JWT_KEY`
- Updated `proxy.ts` to pass:
  - `jwtKey: process.env.CLERK_JWT_KEY`
- This lets Clerk middleware verify handshake/session JWTs locally instead of fetching JWKS during the document navigation.

Networkless handshake verification:

- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- Verified the latest HAR `__clerk_handshake` JWT signature against the new local public key with Node crypto:
  - `networklessHandshakeSignatureValid: true`
- `npm run build` was attempted with proxy env vars but failed on Google font downloads from `fonts.gstatic.com`, not on the auth code. This is the same external font fetch class of failure seen earlier in the project history.
- Required local retest:
  - Stop and restart `npm run dev` so `.env.local` and `proxy.ts` are reloaded.
  - Clear localhost Clerk cookies/site data or use a fresh browser profile.
  - Re-check the HAR timeline. The `/?__clerk_handshake=...` request should no longer spend multiple seconds fetching JWKS remotely.

Undici proxy failure follow-up:

- A private-window retest failed before the app reached the local handshake-token verification step:
  - `/__clerk/v1/client/handshake?...` returned `500` after about `7.7s`.
  - The server stack pointed to `fetch(targetUrl, fetchOptions)` inside `app/%5F%5Fclerk/[[...path]]/route.ts`.
  - The error was `UND_ERR_CONNECT_TIMEOUT` against the corporate proxy endpoint.
- Control checks showed the corporate proxy itself was usable:
  - `curl -x http://www-proxy.us.oracle.com:80` reached Clerk and returned the expected `307`.
  - Undici `EnvHttpProxyAgent` and `ProxyAgent` timed out on the same Clerk handshake URL.
  - Raw TCP to the proxy's IPv4 address connected, while the IPv6 address timed out.
- Root cause: the local `/__clerk` proxy still depended on Undici for remote Clerk GETs, and Undici's proxy connection path is unreliable in this VPN/proxy environment.

Undici proxy failure implementation:

- Added `https-proxy-agent` as a direct dependency.
- Updated `app/%5F%5Fclerk/[[...path]]/route.ts` so idempotent, bodyless Clerk Frontend API requests use Node's `https.request` with `HttpsProxyAgent` when proxy env vars are set.
- The fallback forces IPv4 by default to avoid the observed IPv6 proxy timeout.
- `PROXY_FORCE_IPV4=false` can opt out of that default.
- `PROXY_REQUEST_TIMEOUT_MS=<milliseconds>` can tune the Node proxy request timeout.
- Non-idempotent/body requests still use the existing fetch path to avoid replaying request bodies.

Undici proxy failure verification:

- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- Direct `HttpsProxyAgent` verification through the corporate proxy:
  - Clerk handshake returned `307` in about `1454ms`.
  - `@clerk/clerk-js@6.17.0` returned `200` in about `2335ms`.
  - `/v1/client` returned `200` in about `1172ms`.
- Required local retest:
  - Restart `npm run dev` so the route handler reloads.
  - Use the same proxy env vars.
  - The `/__clerk/v1/client/handshake?...` route should no longer fail with Undici `UND_ERR_CONNECT_TIMEOUT`; it should complete through the Node proxy-agent path.
