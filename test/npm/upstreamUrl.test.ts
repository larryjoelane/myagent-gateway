import { describe, expect, it } from "vitest";
import { buildUpstreamUrl } from "../../src/npm/upstreamUrl.ts";

const ORIGIN = "https://registry.npmjs.org";

describe("buildUpstreamUrl", () => {
  it("builds a packument url", () => {
    expect(buildUpstreamUrl(ORIGIN, { kind: "packument", packageName: "express" })).toBe(
      "https://registry.npmjs.org/express",
    );
  });

  it("builds a scoped packument url with encoded slash", () => {
    expect(buildUpstreamUrl(ORIGIN, { kind: "packument", packageName: "@types/node" })).toBe(
      "https://registry.npmjs.org/@types%2fnode",
    );
  });

  it("builds a version url", () => {
    expect(buildUpstreamUrl(ORIGIN, { kind: "version", packageName: "express", version: "4.18.2" })).toBe(
      "https://registry.npmjs.org/express/4.18.2",
    );
  });

  it("builds a tarball url", () => {
    expect(
      buildUpstreamUrl(ORIGIN, { kind: "tarball", packageName: "express", fileName: "express-4.18.2.tgz" }),
    ).toBe("https://registry.npmjs.org/express/-/express-4.18.2.tgz");
  });

  it("returns null for unknown requests", () => {
    expect(buildUpstreamUrl(ORIGIN, { kind: "unknown" })).toBeNull();
  });

  it("strips trailing slashes from the origin", () => {
    expect(buildUpstreamUrl("https://registry.npmjs.org/", { kind: "packument", packageName: "express" })).toBe(
      "https://registry.npmjs.org/express",
    );
  });
});
