import { parseNpmRequest } from "../npm/parseRequest.ts";
import { buildUpstreamUrl } from "../npm/upstreamUrl.ts";
import { findShasumForTarball } from "../npm/extractShasum.ts";
import { handleMetadataRequest } from "./metadata.ts";
import { handleTarballRequest } from "./tarball.ts";
import type { NpmPackument } from "../npm/types.ts";

interface NpmEnv {
  readonly NPM_UPSTREAM: string;
}

/** Routes a path already stripped of its /npm prefix to the appropriate npm handler. */
export async function handleNpmRequest(path: string, env: NpmEnv, proxyOrigin: string): Promise<Response> {
  const parsed = parseNpmRequest(path);
  const cache = caches.default;

  switch (parsed.kind) {
    case "packument":
    case "version":
      return handleMetadataRequest({
        parsed,
        upstreamOrigin: env.NPM_UPSTREAM,
        proxyOrigin,
        cache,
      });

    case "tarball": {
      const expectedShasum = await lookupExpectedShasum(env.NPM_UPSTREAM, parsed.packageName, parsed.fileName);
      return handleTarballRequest({ parsed, upstreamOrigin: env.NPM_UPSTREAM, cache, expectedShasum });
    }

    case "unknown":
      return Response.json({ error: "not found" }, { status: 404 });
  }
}

async function lookupExpectedShasum(
  upstreamOrigin: string,
  packageName: string,
  fileName: string,
): Promise<string | undefined> {
  const packumentUrl = buildUpstreamUrl(upstreamOrigin, { kind: "packument", packageName });
  if (!packumentUrl) return undefined;

  const response = await fetch(packumentUrl, { headers: { accept: "application/json" } });
  if (!response.ok) return undefined;

  const packument = (await response.json()) as NpmPackument;
  return findShasumForTarball(packument, fileName);
}
