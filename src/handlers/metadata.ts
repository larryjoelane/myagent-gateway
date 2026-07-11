import { buildUpstreamUrl } from "../npm/upstreamUrl.ts";
import { rewritePackumentTarballs } from "../npm/rewritePackument.ts";
import { checkDenyList } from "../security/denyList.ts";
import { DENY_LIST } from "../security/denyListData.ts";
import type { ParsedNpmRequest, NpmPackument } from "../npm/types.ts";

export interface MetadataRequestContext {
  readonly parsed: Extract<ParsedNpmRequest, { kind: "packument" | "version" }>;
  readonly upstreamOrigin: string;
  readonly proxyOrigin: string;
  readonly cache: Cache;
}

/** Serves an npm packument or single-version manifest, cached at the edge. */
export async function handleMetadataRequest(ctx: MetadataRequestContext): Promise<Response> {
  const denyResult = checkDenyList(
    DENY_LIST,
    ctx.parsed.packageName,
    ctx.parsed.kind === "version" ? ctx.parsed.version : null,
  );
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

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: { accept: "application/json" },
  });
  if (!upstreamResponse.ok) {
    return new Response(upstreamResponse.body, upstreamResponse);
  }

  const body = (await upstreamResponse.json()) as NpmPackument | Record<string, unknown>;
  const rewritten = "versions" in body ? rewritePackumentTarballs(body as NpmPackument, ctx.proxyOrigin) : body;

  const response = Response.json(rewritten, {
    headers: { "cache-control": "public, max-age=300" },
  });
  await ctx.cache.put(cacheKey, response.clone());
  return response;
}
