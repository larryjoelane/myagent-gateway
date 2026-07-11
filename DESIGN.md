# ai-gateway — Design

## What this is

A Cloudflare Worker (TypeScript) that serves two purposes under one deployment:

1. **Dependency/supply-chain proxy** — a caching pass-through proxy for npm, PyPI, and NuGet that gives us a
   single choke point to enforce integrity checks and block known-malicious packages, without clients changing
   their workflow beyond a registry/index-url config change.
2. **AI gateway** — auth-gated brokering of LLM provider calls and MCP tools (starting with
   [Context7](https://context7.com), a documentation-retrieval MCP server), so agents get a single authenticated
   entry point instead of holding provider credentials directly.

Auth for both surfaces is Microsoft **Entra External ID (CIAM)** — Entra ID B2C is closed to new tenants as of
May 2025, so we're building on the current product, not the legacy one.

## Getting started

### 1. Install dependencies

```
npm install
```

### 2. Create your Worker config

`wrangler.jsonc` is gitignored (it holds your specific tenant/client IDs, hostnames, and routes). Copy the
committed template and fill in your own values:

```
cp wrangler.jsonc.example wrangler.jsonc
```

Then edit `wrangler.jsonc` and replace the placeholders:

- `<your-domain>` — your Cloudflare zone (e.g. `larrylane.dev`), in the `routes` patterns and the
  `REGISTRY_HOSTNAME` / `CONTEXT7_HOSTNAME` vars.
- `<your-tenant-id-guid>` — `ENTRA_TENANT_ID`, your Entra External ID (CIAM) tenant (directory) ID.
- `<your-client-id-guid>` — `ENTRA_AUDIENCE`, the app registration's client (application) ID. **This is the
  bare GUID, not the `api://...` scope URI** — it's the token's `aud` claim (see the Auth section).
- `CORS_ALLOWED_ORIGINS` — comma-separated browser origins allowed to call the gateway; the defaults cover the
  local Swagger console. Never wildcard.

None of these are secrets — they're public identifiers that appear in every issued token. Real secrets are set
separately (next step).

### 3. Create the local env file (`.dev.vars`)

Secrets are never put in `wrangler.jsonc`. For local runs (`wrangler dev`, the Swagger console, the auth test
scripts), copy the example env file and fill it in:

```
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars`:

- `CONTEXT7_API_KEY` — from [context7.com/dashboard](https://context7.com/dashboard). Required for the
  `context7.*` brokering endpoints to return real responses.
- `CLIENT_SECRET` — a client secret created under the Entra app registration's **Certificates & secrets**.
  Used only by the local Swagger console (`swagger/serve.mjs`) and the auth test scripts to mint bearer tokens;
  the Worker itself never sees it.

`.dev.vars` is gitignored — never commit it.

### 4. Set the deployed secret

`.dev.vars` only covers local runs. For the deployed Worker, set the Context7 key as a real Cloudflare secret
(this prompts for the value; it is not stored in any file):

```
npx wrangler secret put CONTEXT7_API_KEY
```

### 5. Run and deploy

```
npm test            # unit tests
npm run typecheck   # type check
npm run swagger     # local API console at http://127.0.0.1:5173
npm run dev         # local wrangler dev
npm run deploy      # deploy to Cloudflare
```

DNS records for the subdomains must exist as **proxied** records before Worker routes resolve — see
"DNS records required" below.

## Why one Worker

Both surfaces need the same auth check, the same edge-caching primitives, and the same deny-by-default posture
on methods/routes. Splitting into separate Workers buys nothing until we need independent scaling or deploy
cadence — not true yet. One Worker, one `wrangler.jsonc`, one deploy; traffic is split first by hostname, then
by path, into feature modules that don't share code except through explicit shared modules (`src/auth`,
`src/security`, `src/cache`).

## Routing: hostname-first, then path

**Decision: split by hostname, not by path prefix on a single host.**

Domain: **larrylane.dev** (already a Cloudflare zone on this account). Each MCP tool gets its own subdomain
named after the tool itself, rather than a generic `mcp.` catch-all — legible DNS/routing as more tools are
added later, each independently controllable (WAF, rate limits, Access policy) without path-prefix conditions.

```
registry.larrylane.dev   → package proxy (npm, PyPI, NuGet)
context7.larrylane.dev   → Context7 MCP brokering
<tool>.larrylane.dev     → future MCP tools, one subdomain each
```

Within `registry.larrylane.dev`, ecosystems are also split, because npm/pip/NuGet clients all expect to treat
their configured registry URL as a bare root (`.npmrc` `registry=`, pip `--index-url`, NuGet `index.json`
location). Multiple ecosystems can't all own `/` on the same host, so each gets a prefix:

```
registry.larrylane.dev/npm/*      → npm proxy   (already built, currently mounted at root — will move under /npm)
registry.larrylane.dev/pypi/*     → PyPI proxy  (not built yet)
registry.larrylane.dev/nuget/*    → NuGet proxy (not built yet)
```

### Why hostname over path for the registry/MCP split specifically

- **Client convention**: registry tooling wants a bare origin as its configured URL. Because we already need
  more than one such root (npm, PyPI, NuGet), hostname separation is required infrastructure regardless of
  MCP — adding MCP under its own hostname is then free and consistent, rather than being the one surface stuck
  under a path prefix while package ecosystems get roots.
- **Cache-key isolation**: Workers Cache API keys off the full `Request` (URL-based). Hostname separation
  partitions the cache namespace for free; a path-prefix scheme needs to be careful never to let a `/mcp/...`
  request and a `/registry/...` request collide in cache-key space.
- **Trust boundary clarity**: package-proxy clients and MCP clients are different actors with different auth
  scopes. Separate hostnames make it trivial to apply different Cloudflare-level controls (WAF, rate limits,
  Access policies) per surface later without threading path-prefix conditions through every rule.

Cost of this choice: DNS + cert setup for two (sub)domains instead of one. No added code complexity — it's
still one Worker, routed by `url.hostname` first, `url.pathname` second.

### DNS records required

Worker Routes match on hostname but do not create DNS records themselves — a **proxied** (orange-cloud) DNS
record must already exist for a hostname before Cloudflare will route matching requests to the Worker. Without
one, the hostname doesn't resolve at all (`NXDOMAIN`).

| Type | Name        | Content     | Proxy status |
|------|-------------|-------------|--------------|
| A    | `registry`  | `192.0.2.1` | Proxied      |
| A    | `context7`  | `192.0.2.1` | Proxied      |

Both records point at the same IP, and that IP is never actually contacted. Once a record is proxied,
Cloudflare's edge intercepts the request at the DNS/TLS layer and matches it against Worker Routes *before*
attempting to reach the address the record lists — the A record's only job is to make the hostname resolve to
something, so the value is an inert placeholder. `192.0.2.1` is in IANA's TEST-NET-1 range
([RFC 5737](https://www.rfc-editor.org/rfc/rfc5737)), reserved for documentation and guaranteed non-routable,
which makes the "this is a dummy" intent legible to anyone reading the zone later. Two hostnames sharing the
same dummy value is not a collision — Worker Route matching happens on hostname, not on the IP.

Managed manually via the Cloudflare dashboard (DNS tab on the `larrylane.dev` zone) rather than through
`wrangler`/API, since DNS changes on the apex domain are the kind of shared, externally-visible change worth a
human hand on it.

## Module layout (target)

```
src/
  index.ts              Routing only: hostname -> pathname -> handler. No business logic.

  auth/                 Entra External ID (CIAM) token validation. Shared by both surfaces.
    validateToken.ts    Pure: verify JWT signature/claims given a JWKS.
    jwks.ts             I/O: fetch + cache JWKS from Entra's discovery endpoint.

  cache/                Shared Cache API helpers (thin wrapper, consistent key construction).

  security/             Shared deny-by-default primitives.
    isAllowedMethod.ts  (done)
    denyList.ts         (done) — package deny-list, allow-by-default on identity, deny known-bad.
    verifyIntegrity.ts  (done)

  crypto/
    sha1Hex.ts           (done)

  npm/                   (done) — pure protocol logic: parseRequest, upstreamUrl, rewritePackument, extractShasum.
  pypi/                  (not built) — PEP 503/691 simple-repository protocol, same pure/impure split as npm/.
  nuget/                 (not built) — V3 service index + registration + package-content protocol.
  context7/              (done) — pure protocol logic: parseRequest, upstreamUrl, targeting Context7's REST API.

  handlers/
    metadata.ts          (done, npm) — I/O shell: fetch + cache + calls into npm/* pure functions.
    tarball.ts            (done, npm)
    npmRouter.ts           (done, npm) — routes a stripped /npm path to metadata.ts / tarball.ts.
    context7Router.ts      (done) — I/O shell: forwards to context7.com/api/v2/*, relays status + rate-limit headers.
    pypi/                 (not built)
    nuget/                (not built)
```

Every function in a pure module (`npm/`, `pypi/`, `nuget/`, `context7/`, `security/`, most of
`auth/validateToken.ts`) takes plain inputs, returns plain outputs, and does no `fetch`/`caches`/`crypto.subtle`
I/O — those live only in `handlers/` and the `I/O:` — labeled files above. This is why the npm and context7
modules currently have no file over ~60 lines and are fully unit-tested without mocking network calls.

## Auth: Entra External ID (CIAM), client-credentials, bearer-only at the gateway

**Decision: the gateway only ever validates bearer tokens. It never accepts or sees a client_id/secret.**

This is the standard OAuth2 client-credentials pattern (RFC 6749 §4.4) that every SaaS API uses — Stripe,
GitHub, any Auth0/Entra-protected API. The alternative (accepting client_id+secret as headers on every call and
having the API perform the exchange) would mean a long-lived, rarely-transmitted secret gets sent on every
single request instead of once — multiplying exposure across logs, tracing, and any intermediate proxy for a
credential that's supposed to stay put. A bearer token is short-lived (~1 hour) and designed to be passed
around; a leak is bounded and self-healing in a way a client secret leak is not.

Flow:

```
1. Caller -> POST https://{tenant}.ciamlogin.com/{tenant}/oauth2/v2.0/token   (once, cache ~1hr)
     grant_type=client_credentials
     client_id=<app registration client id>
     client_secret=<app registration secret>
     scope=api://<client-id>/.default
   <- access_token (JWT, RS256)

2. Caller -> GET registry.larrylane.dev/npm/left-pad   (every request)
     Authorization: Bearer <access_token>

3. Gateway -> verifies signature via tenant JWKS (createRemoteJWKSet, cached per-isolate),
              checks iss == https://{tenant}.ciamlogin.com/{tenant}/v2.0,
              checks aud == <client-id GUID>   (NOT the api://... form — see finding below)
```

Applies uniformly to both surfaces (`registry.*` and `context7.*`) via a single `authenticate()` check at the
top of `src/index.ts`, before hostname routing — no request reaches a handler without a valid token.

**Finding — `aud` is the bare client GUID, not the `api://` URI.** Even though the requested scope is
`api://<client-id>/.default`, the Entra CIAM v2 access token issued for the app's own resource carries
`aud: <client-id>` (bare GUID), and `ENTRA_AUDIENCE` must be set to that GUID, not the `api://` form. Verified
by decoding a real token: `aud` and `appid` were both the bare GUID, `ver` was `2.0`. Setting `ENTRA_AUDIENCE`
to the `api://` form produces `unexpected "aud" claim value` on every request.

**Finding — Entra blocks browser-based client-credentials via CORS.** The `ciamlogin.com` token endpoint answers
the `OPTIONS` preflight with `Access-Control-Allow-Origin: *` but omits CORS headers on the actual `POST`
response, and Swagger UI's fetch sends `credentials: "include"` (a wildcard ACAO is invalid on a credentialed
request per the Fetch spec). Net effect: a browser SPA cannot complete client-credentials against Entra, even
though the identical request succeeds via curl/server-side. This is why the local Swagger console
(`swagger/serve.mjs`) mints the token **server-side** at `/token` rather than via Swagger UI's built-in OAuth2
flow. Auth-code + PKCE *is* CORS-enabled on Entra and would work in-browser, but that's the interactive-user
flow, not machine-to-machine.

### Gateway CORS

The Worker adds CORS support so browser origins (the local Swagger console today) can call it. Deny-by-default,
allow-listed origins only — never wildcard, since this is an auth-gated supply-chain proxy. `CORS_ALLOWED_ORIGINS`
(comma-separated) is checked against the request `Origin`; a match is echoed back in `Access-Control-Allow-Origin`
(with `Vary: Origin`), a non-match gets no CORS header (browser blocks it). `OPTIONS` preflight is answered
**before** the method/auth checks (preflight carries no `Authorization` header by design, so it must not 401/405),
and CORS headers are attached to all real responses including error responses so the browser can read them.

Configured tenant/app registration (this project's own Entra CIAM instance, used to authenticate callers of
the gateway — unrelated to the Context7 API key, which authenticates the *gateway* to Context7):

- Tenant ID: `49850daf-e786-4aaa-baca-a064c11adb2f`
- Client (app) ID: `ef6896d0-a631-4fa7-8e39-f6e975f0d981`
- API scope: `api://ef6896d0-a631-4fa7-8e39-f6e975f0d981/access_as_application`
- Token audience (`aud`): `ef6896d0-a631-4fa7-8e39-f6e975f0d981` (bare GUID — this is `ENTRA_AUDIENCE`)
- Client secret: created under the app registration's **Certificates & secrets** — never committed, never
  sent to the gateway; used only by callers to obtain their own bearer tokens.

### Local testing tools

- `scripts/test-auth.mjs` — fetches a real client-credentials token and exercises both deployed surfaces
  (no token / bogus token / real token) to confirm the auth gate behaves correctly end to end. Run with
  `CLIENT_SECRET=<secret> node scripts/test-auth.mjs`.
- `swagger/` — a local Swagger UI console (`npm run swagger`, then open `http://127.0.0.1:5173`) for manually
  exploring and calling the live endpoints from a browser. `swagger/openapi.yaml` declares the Entra CIAM
  client-credentials flow as the spec's security scheme, so Swagger UI's **Authorize** button collects the
  client ID/secret, performs the token exchange itself, and attaches the resulting bearer token to every
  "Try it out" call automatically — no manual header copying needed. `swagger/serve.mjs` is a small
  dependency-free Node static server (serves `swagger-ui-dist`'s assets + the YAML spec converted to JSON on
  the fly); nothing is deployed, it only talks to the already-live `registry.larrylane.dev` /
  `context7.larrylane.dev` endpoints.

## Context7 brokering: REST passthrough, not full MCP protocol

**Decision: expose Context7 as plain REST passthrough, not as a full MCP protocol server.**

Context7's real MCP transport (JSON-RPC 2.0 over a streaming HTTP transport, stateful session
initialization/capability negotiation) is materially more complex to proxy correctly than its REST API
(`GET /api/v2/libs/search`, `GET /api/v2/context` — plain query params, plain JSON responses). A correct MCP
passthrough would likely need a Durable Object to pin session state per client; a subtly-wrong implementation
of the MCP handshake is easy to end up with and hard to notice, which is worse than an honestly-scoped REST
proxy that is fully correct and verifiable today.

REST passthrough is also sufficient for the near-term use case: a Claude Code **skill** that wants Context7
docs doesn't need an MCP client connection — it just runs `curl` against an HTTP endpoint from its own
instructions/scripts, same as calling any other API. Full MCP protocol support would only be needed if the goal
becomes having a top-level MCP client (e.g. Claude Code's own MCP tool picker) add `context7.larrylane.dev`
directly as a zero-config tool source — a different, narrower goal than "a skill can call it." Revisit if that
need materializes.

Endpoints exposed on `context7.larrylane.dev`:

```
GET /search?libraryName=<name>&query=<optional>   → forwards to /api/v2/libs/search
GET /docs?libraryId=<id>&query=<optional>&type=<optional> → forwards to /api/v2/context
```

Context7's rate-limit headers (`Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) are
relayed through unchanged so a caller can see real upstream limits rather than being surprised by an opaque
`429`.

### Context7 API key setup

Brokering requires a Context7 API key (from [context7.com/dashboard](https://context7.com/dashboard)),
attached as a `Bearer` token on every upstream request. Set it as a Worker secret (never a plain `vars` entry,
since secrets aren't visible in `wrangler.jsonc` or deploy logs):

```
npx wrangler secret put CONTEXT7_API_KEY
```

Paste the key when prompted. Required before `context7.larrylane.dev` can serve real responses — without it,
upstream calls will fail with `401 Unauthorized` from Context7.

## Security posture (v1)

- **Methods**: allow-list, deny-by-default. Only `GET`/`HEAD` are forwarded upstream on the registry surface —
  this proxy never forwards writes (publish/unpublish/etc).
- **Package identity**: deny-list, allow-by-default. Pre-approving the full transitive install graph isn't
  viable for a package proxy (every real-world proxy — Artifactory, Nexus, Sonatype — works this way), so we
  block known-bad name/version pairs rather than requiring pre-approval of every package. Seed list is empty;
  intended to sync from an OSV or vendor feed later.
- **Integrity**: tarball/package bytes are hashed and checked against the registry-declared digest before
  being cached or served, catching corruption/tampering in transit.
- **Deferred to v2+**: malware ML scoring, quarantine-until-scanned workflow, sigstore/provenance verification,
  license policy engine, dependency-confusion namespace guard.

## Platform constraints assumed

- Cloudflare Workers **free plan** to start (100k requests/day, 50 subrequests/request cap — sufficient for
  metadata + blocklist + cache calls per install).
- **Cache API only** for v1 caching (no R2/KV/D1 yet). R2 is the natural next addition once we want cache
  entries to survive Cache API eviction or persist cross-colo; not required to start.
- Binary bodies for npm tarballs are currently buffered in memory (not streamed) because integrity verification
  requires the full byte range before the response can be trusted. Acceptable at typical npm package sizes
  under the 128MB isolate memory limit; revisit if PyPI/NuGet package sizes push against that.

## Status

| Surface                  | Status        |
|---------------------------|--------------|
| npm proxy (metadata, tarball, deny-list, integrity, method allow-list) | **Live** at `registry.larrylane.dev/npm/*` — verified with a real `npm install` against production |
| Hostname/path routing (registry vs. context7 host split, `/npm` prefix) | **Live** — verified end-to-end against the deployed edge |
| DNS records (`registry`, `context7` proxied A records) | **Live** |
| PyPI proxy                | Not started |
| NuGet proxy                | Not started |
| Entra External ID (CIAM) auth | Not started — Context7 brokering currently has no gateway-level auth of its own |
| Context7 REST brokering (`/search`, `/docs`) | **Live** at `context7.larrylane.dev` — `CONTEXT7_API_KEY` secret set, verified against real upstream responses (search results, docs snippets, correct per-response content-type, rate-limit headers relayed) |

## Next steps

1. Build `src/auth/` (Entra CIAM token validation) and wire it into both surfaces — right now anyone who finds
   `context7.larrylane.dev` can spend your Context7 API quota; this is the priority gap.
2. Build PyPI proxy (`src/pypi/`, `src/handlers/pypi/`) following the npm pure/impure split.
3. Build NuGet proxy (`src/nuget/`, `src/handlers/nuget/`).
