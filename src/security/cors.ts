export interface CorsDecision {
  readonly allowedOrigin: string | null;
}

/** Decides the Access-Control-Allow-Origin value for a request origin against an allow-list. Pure. */
export function resolveCorsOrigin(
  requestOrigin: string | null,
  allowedOrigins: readonly string[],
): CorsDecision {
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return { allowedOrigin: requestOrigin };
  }
  return { allowedOrigin: null };
}

/** Builds the CORS response headers for an allowed origin. Pure. */
export function buildCorsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
