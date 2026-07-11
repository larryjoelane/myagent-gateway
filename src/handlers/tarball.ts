import { buildUpstreamUrl } from "../npm/upstreamUrl.ts";
import { checkDenyList } from "../security/denyList.ts";
import { DENY_LIST } from "../security/denyListData.ts";
import { verifyShasum } from "../security/verifyIntegrity.ts";
import { sha1Hex } from "../crypto/sha1Hex.ts";
import type { ParsedNpmRequest } from "../npm/types.ts";

export interface TarballRequestContext {
  readonly parsed: Extract<ParsedNpmRequest, { kind: "tarball" }>;
  readonly upstreamOrigin: string;
  readonly cache: Cache;
  readonly expectedShasum: string | undefined;
}

/**
 * Serves an npm tarball, verifying its sha1 against the packument-declared shasum
 * before caching. Buffers the full tarball in memory to verify — Workers free-plan
 * package sizes (almost always well under the 128MB isolate limit) make this safe;
 * revisit if a target ecosystem needs streaming verification.
 */
export async function handleTarballRequest(ctx: TarballRequestContext): Promise<Response> {
  const denyResult = checkDenyList(DENY_LIST, ctx.parsed.packageName, null);
  if (denyResult.blocked) {
    return Response.json({ error: "package blocked", reason: denyResult.reason }, { status: 451 });
  }

  const upstreamUrl = buildUpstreamUrl(ctx.upstreamOrigin, ctx.parsed);
  if (!upstreamUrl) {
    return Response.json({ error: "could not resolve upstream url" }, { status: 400 });
  }

  const cacheKey = new Request(upstreamUrl, { method: "GET" });
  const cached = await ctx.cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const upstreamResponse = await fetch(upstreamUrl);
  if (!upstreamResponse.ok) {
    return new Response(upstreamResponse.body, upstreamResponse);
  }

  const bytes = await upstreamResponse.arrayBuffer();
  const actualShasumHex = await sha1Hex(bytes);
  const integrity = verifyShasum({ expectedShasum: ctx.expectedShasum, actualShasumHex });
  if (!integrity.valid) {
    return Response.json({ error: "integrity check failed", reason: integrity.reason }, { status: 502 });
  }

  const response = new Response(bytes, {
    headers: {
      "content-type": "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
  await ctx.cache.put(cacheKey, response.clone());
  return response;
}
