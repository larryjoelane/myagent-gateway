import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import type { TokenValidationConfig, TokenValidationResult } from "./types.ts";

// createRemoteJWKSet caches fetched keys in-memory for the isolate's lifetime,
// keeping repeated verifications within the same isolate to zero extra subrequests.
const jwksCache = new Map<string, JWTVerifyGetKey>();

function getJwks(jwksUri: string): JWTVerifyGetKey {
  const cached = jwksCache.get(jwksUri);
  if (cached) return cached;

  const jwks = createRemoteJWKSet(new URL(jwksUri));
  jwksCache.set(jwksUri, jwks);
  return jwks;
}

/** Verifies a JWT's signature (via the tenant's JWKS) and its issuer/audience claims. */
export async function validateToken(
  token: string,
  jwksUri: string,
  config: TokenValidationConfig,
): Promise<TokenValidationResult> {
  try {
    const { payload } = await jwtVerify(token, getJwks(jwksUri), {
      issuer: config.issuer,
      audience: config.audience,
    });
    return { valid: true, claims: payload };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : "token verification failed" };
  }
}
