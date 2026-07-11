/** Extracts the token from a "Bearer <token>" Authorization header value. Pure. */
export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;

  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match ? (match[1] as string) : null;
}
