import { resolveSurface } from "./routing/resolveSurface.ts";
import { resolveEcosystem } from "./routing/resolveEcosystem.ts";
import { isAllowedMethod } from "./security/isAllowedMethod.ts";
import { resolveCorsOrigin, buildCorsHeaders } from "./security/cors.ts";
import { handleNpmRequest } from "./handlers/npmRouter.ts";
import { handleContext7Request } from "./handlers/context7Router.ts";
import { extractBearerToken } from "./auth/extractBearerToken.ts";
import { validateToken } from "./auth/validateToken.ts";

export interface Env {
  readonly NPM_UPSTREAM: string;
  readonly REGISTRY_HOSTNAME: string;
  readonly CONTEXT7_HOSTNAME: string;
  readonly CONTEXT7_API_KEY: string;
  readonly ENTRA_TENANT_ID: string;
  readonly ENTRA_AUDIENCE: string;
  readonly CORS_ALLOWED_ORIGINS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS);
    const { allowedOrigin } = resolveCorsOrigin(request.headers.get("origin"), allowedOrigins);

    // Answer CORS preflight before auth/method checks — preflight carries no
    // Authorization header by design, so it must not be rejected as 401/405.
    if (request.method === "OPTIONS") {
      const headers = allowedOrigin ? buildCorsHeaders(allowedOrigin) : {};
      return new Response(null, { status: 204, headers });
    }

    const response = await route(request, env);
    return allowedOrigin ? withCors(response, allowedOrigin) : response;
  },
};

async function route(request: Request, env: Env): Promise<Response> {
  if (!isAllowedMethod(request.method)) {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const authResult = await authenticate(request, env);
  if (!authResult.valid) {
    return Response.json({ error: "unauthorized", reason: authResult.reason }, { status: 401 });
  }

  const url = new URL(request.url);
  const surface = resolveSurface(url.hostname, {
    registry: env.REGISTRY_HOSTNAME,
    context7: env.CONTEXT7_HOSTNAME,
  });

  switch (surface) {
    case "registry":
      return handleRegistryRequest(url, env);
    case "context7":
      return handleContext7Request(url, env);
    case "unrecognized":
      return Response.json({ error: "unrecognized host" }, { status: 404 });
  }
}

function parseAllowedOrigins(raw: string | undefined): readonly string[] {
  return (raw ?? "").split(",").map((o) => o.trim()).filter((o) => o.length > 0);
}

function withCors(response: Response, allowedOrigin: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(buildCorsHeaders(allowedOrigin))) {
    headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function authenticate(request: Request, env: Env) {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    return { valid: false as const, reason: "missing bearer token" };
  }

  const jwksUri = `https://${env.ENTRA_TENANT_ID}.ciamlogin.com/${env.ENTRA_TENANT_ID}/discovery/v2.0/keys`;
  const issuer = `https://${env.ENTRA_TENANT_ID}.ciamlogin.com/${env.ENTRA_TENANT_ID}/v2.0`;

  return validateToken(token, jwksUri, { issuer, audience: env.ENTRA_AUDIENCE });
}

async function handleRegistryRequest(url: URL, env: Env): Promise<Response> {
  const { ecosystem, remainingPath } = resolveEcosystem(url.pathname);

  switch (ecosystem) {
    case "npm":
      return handleNpmRequest(remainingPath, env, url.origin + "/npm");
    case "pypi":
    case "nuget":
      return Response.json({ error: `${ecosystem} proxy not yet implemented` }, { status: 501 });
    case "unrecognized":
      return Response.json({ error: "not found" }, { status: 404 });
  }
}
