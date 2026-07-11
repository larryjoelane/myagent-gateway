import { parseContext7Request } from "../context7/parseRequest.ts";
import { buildContext7UpstreamUrl } from "../context7/upstreamUrl.ts";

interface Context7Env {
  readonly CONTEXT7_API_KEY: string;
}

const FORWARDED_RATE_LIMIT_HEADERS = ["retry-after", "ratelimit-limit", "ratelimit-remaining", "ratelimit-reset"];

/** Routes a Context7 proxy request: parses it, forwards to the upstream REST API, relays the response. */
export async function handleContext7Request(url: URL, env: Context7Env): Promise<Response> {
  const parsed = parseContext7Request(url.pathname, url.searchParams);
  const upstreamUrl = buildContext7UpstreamUrl(parsed);

  if (!upstreamUrl) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: { authorization: `Bearer ${env.CONTEXT7_API_KEY}` },
  });

  const headers = new Headers();
  const contentType = upstreamResponse.headers.get("content-type");
  headers.set("content-type", contentType ?? "application/octet-stream");
  for (const name of FORWARDED_RATE_LIMIT_HEADERS) {
    const value = upstreamResponse.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers });
}
