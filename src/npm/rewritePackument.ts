import type { NpmPackument, NpmVersionManifest } from "./types.ts";

/** Rewrites every dist.tarball URL in a packument to point at the proxy origin. */
export function rewritePackumentTarballs(packument: NpmPackument, proxyOrigin: string): NpmPackument {
  const rewrittenVersions = Object.fromEntries(
    Object.entries(packument.versions).map(([version, manifest]) => [
      version,
      rewriteVersionManifest(manifest, proxyOrigin),
    ]),
  );

  return { ...packument, versions: rewrittenVersions };
}

function rewriteVersionManifest(manifest: NpmVersionManifest, proxyOrigin: string): NpmVersionManifest {
  return {
    ...manifest,
    dist: {
      ...manifest.dist,
      tarball: rewriteTarballUrl(manifest.dist.tarball, proxyOrigin),
    },
  };
}

function rewriteTarballUrl(originalTarballUrl: string, proxyOrigin: string): string {
  const parsed = new URL(originalTarballUrl);
  return `${proxyOrigin.replace(/\/+$/, "")}${parsed.pathname}`;
}
