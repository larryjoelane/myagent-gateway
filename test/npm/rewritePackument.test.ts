import { describe, expect, it } from "vitest";
import { rewritePackumentTarballs } from "../../src/npm/rewritePackument.ts";
import type { NpmPackument } from "../../src/npm/types.ts";

describe("rewritePackumentTarballs", () => {
  it("rewrites tarball urls to the proxy origin while preserving the path", () => {
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

    const result = rewritePackumentTarballs(packument, "https://proxy.example.com");

    expect(result.versions["4.18.2"]?.dist.tarball).toBe(
      "https://proxy.example.com/express/-/express-4.18.2.tgz",
    );
  });

  it("does not mutate the original packument", () => {
    const packument: NpmPackument = {
      name: "express",
      "dist-tags": { latest: "1.0.0" },
      versions: {
        "1.0.0": {
          name: "express",
          version: "1.0.0",
          dist: { tarball: "https://registry.npmjs.org/express/-/express-1.0.0.tgz" },
        },
      },
    };

    rewritePackumentTarballs(packument, "https://proxy.example.com");

    expect(packument.versions["1.0.0"]?.dist.tarball).toBe(
      "https://registry.npmjs.org/express/-/express-1.0.0.tgz",
    );
  });
});
