import { describe, expect, it } from "vitest";
import { parseNpmRequest } from "../../src/npm/parseRequest.ts";

describe("parseNpmRequest", () => {
  it("parses a packument request", () => {
    expect(parseNpmRequest("/express")).toEqual({ kind: "packument", packageName: "express" });
  });

  it("parses a scoped packument request", () => {
    expect(parseNpmRequest("/@types/node")).toEqual({ kind: "packument", packageName: "@types/node" });
  });

  it("parses a scoped packument request with encoded slash", () => {
    expect(parseNpmRequest("/@types%2fnode")).toEqual({ kind: "packument", packageName: "@types/node" });
  });

  it("parses a version request", () => {
    expect(parseNpmRequest("/express/4.18.2")).toEqual({
      kind: "version",
      packageName: "express",
      version: "4.18.2",
    });
  });

  it("parses a tarball request", () => {
    expect(parseNpmRequest("/express/-/express-4.18.2.tgz")).toEqual({
      kind: "tarball",
      packageName: "express",
      fileName: "express-4.18.2.tgz",
    });
  });

  it("parses a scoped tarball request", () => {
    expect(parseNpmRequest("/@types/node/-/node-20.0.0.tgz")).toEqual({
      kind: "tarball",
      packageName: "@types/node",
      fileName: "node-20.0.0.tgz",
    });
  });

  it("returns unknown for an empty path", () => {
    expect(parseNpmRequest("/")).toEqual({ kind: "unknown" });
  });

  it("returns unknown for a malformed scoped path", () => {
    expect(parseNpmRequest("/@types")).toEqual({ kind: "unknown" });
  });
});
