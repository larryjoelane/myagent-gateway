import type { ParsedNpmRequest } from "./types.ts";

/**
 * Parses an incoming request path into an npm registry operation.
 * Handles scoped packages (@scope/name and @scope%2fname) and tarball paths (/-/name-version.tgz).
 */
export function parseNpmRequest(pathname: string): ParsedNpmRequest {
  const trimmed = pathname.replace(/^\/+/, "");
  const segments = trimmed.split("/").filter((s) => s.length > 0);

  if (segments.length === 0) {
    return { kind: "unknown" };
  }

  const firstDecoded = decodeURIComponent(segments[0] as string);

  if (firstDecoded.startsWith("@")) {
    // npm allows both "@scope/name" (two path segments) and "@scope%2fname"
    // (one segment with the slash encoded) to refer to the same package.
    if (firstDecoded.includes("/")) {
      return parseRemainder(firstDecoded, segments.slice(1));
    }
    if (segments.length < 2) {
      return { kind: "unknown" };
    }
    const scopeName = decodeURIComponent(segments[1] as string);
    return parseRemainder(`${firstDecoded}/${scopeName}`, segments.slice(2));
  }

  return parseRemainder(firstDecoded, segments.slice(1));
}

function parseRemainder(packageName: string, rest: readonly string[]): ParsedNpmRequest {
  if (rest.length === 0) {
    return { kind: "packument", packageName };
  }

  if (rest[0] === "-" && rest.length === 2) {
    return { kind: "tarball", packageName, fileName: rest[1] as string };
  }

  if (rest.length === 1) {
    return { kind: "version", packageName, version: rest[0] as string };
  }

  return { kind: "unknown" };
}
