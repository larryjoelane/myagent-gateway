import type { ParsedNpmRequest } from "./types.ts";

/** Builds the upstream registry.npmjs.org URL for a parsed npm request. */
export function buildUpstreamUrl(upstreamOrigin: string, request: ParsedNpmRequest): string | null {
  const base = upstreamOrigin.replace(/\/+$/, "");

  switch (request.kind) {
    case "packument":
      return `${base}/${encodePackageName(request.packageName)}`;
    case "version":
      return `${base}/${encodePackageName(request.packageName)}/${encodeURIComponent(request.version)}`;
    case "tarball":
      return `${base}/${encodePackageName(request.packageName)}/-/${request.fileName}`;
    case "unknown":
      return null;
  }
}

function encodePackageName(packageName: string): string {
  return packageName.startsWith("@") ? packageName.replace("/", "%2f") : packageName;
}
