import { describe, expect, it } from "vitest";
import { findShasumForTarball } from "../../src/npm/extractShasum.ts";
import type { NpmPackument } from "../../src/npm/types.ts";

describe("findShasumForTarball", () => {
  const packument: NpmPackument = {
    name: "express",
    "dist-tags": { latest: "4.18.2" },
    versions: {
      "4.18.2": {
        name: "express",
        version: "4.18.2",
        dist: { tarball: "https://registry.npmjs.org/express/-/express-4.18.2.tgz", shasum: "abc123" },
      },
    },
  };

  it("finds the shasum for a matching tarball file name", () => {
    expect(findShasumForTarball(packument, "express-4.18.2.tgz")).toBe("abc123");
  });

  it("returns undefined when no version matches", () => {
    expect(findShasumForTarball(packument, "express-9.9.9.tgz")).toBeUndefined();
  });
});
