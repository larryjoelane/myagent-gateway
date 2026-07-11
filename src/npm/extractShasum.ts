import type { NpmPackument } from "./types.ts";

/** Finds the expected shasum for a tarball file name by scanning a packument's versions. Pure. */
export function findShasumForTarball(packument: NpmPackument, fileName: string): string | undefined {
  const manifest = Object.values(packument.versions).find((v) => v.dist.tarball.endsWith(`/${fileName}`));
  return manifest?.dist.shasum;
}
