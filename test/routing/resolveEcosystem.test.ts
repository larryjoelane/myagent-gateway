import { describe, expect, it } from "vitest";
import { resolveEcosystem } from "../../src/routing/resolveEcosystem.ts";

describe("resolveEcosystem", () => {
  it("resolves an npm packument path", () => {
    expect(resolveEcosystem("/npm/left-pad")).toEqual({ ecosystem: "npm", remainingPath: "/left-pad" });
  });

  it("resolves an npm scoped tarball path", () => {
    expect(resolveEcosystem("/npm/@types/node/-/node-20.0.0.tgz")).toEqual({
      ecosystem: "npm",
      remainingPath: "/@types/node/-/node-20.0.0.tgz",
    });
  });

  it("resolves the bare npm root to /", () => {
    expect(resolveEcosystem("/npm")).toEqual({ ecosystem: "npm", remainingPath: "/" });
  });

  it("resolves a pypi path", () => {
    expect(resolveEcosystem("/pypi/simple/requests/")).toEqual({
      ecosystem: "pypi",
      remainingPath: "/simple/requests/",
    });
  });

  it("resolves a nuget path", () => {
    expect(resolveEcosystem("/nuget/v3/index.json")).toEqual({
      ecosystem: "nuget",
      remainingPath: "/v3/index.json",
    });
  });

  it("returns unrecognized for an unknown prefix", () => {
    expect(resolveEcosystem("/cargo/serde")).toEqual({ ecosystem: "unrecognized", remainingPath: "/cargo/serde" });
  });

  it("returns unrecognized for the bare root", () => {
    expect(resolveEcosystem("/")).toEqual({ ecosystem: "unrecognized", remainingPath: "/" });
  });
});
