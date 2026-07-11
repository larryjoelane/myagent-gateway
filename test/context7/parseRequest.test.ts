import { describe, expect, it } from "vitest";
import { parseContext7Request } from "../../src/context7/parseRequest.ts";

describe("parseContext7Request", () => {
  it("parses a search request", () => {
    const params = new URLSearchParams({ libraryName: "react", query: "hooks" });
    expect(parseContext7Request("/search", params)).toEqual({
      kind: "search",
      params: { libraryName: "react", query: "hooks" },
    });
  });

  it("parses a search request without a query", () => {
    const params = new URLSearchParams({ libraryName: "react" });
    expect(parseContext7Request("/search", params)).toEqual({
      kind: "search",
      params: { libraryName: "react" },
    });
  });

  it("rejects a search request missing libraryName", () => {
    const params = new URLSearchParams({ query: "hooks" });
    expect(parseContext7Request("/search", params)).toEqual({ kind: "unknown" });
  });

  it("parses a docs request", () => {
    const params = new URLSearchParams({ libraryId: "/facebook/react", query: "hooks", type: "json" });
    expect(parseContext7Request("/docs", params)).toEqual({
      kind: "docs",
      params: { libraryId: "/facebook/react", query: "hooks", type: "json" },
    });
  });

  it("rejects a docs request missing libraryId", () => {
    const params = new URLSearchParams({ query: "hooks" });
    expect(parseContext7Request("/docs", params)).toEqual({ kind: "unknown" });
  });

  it("returns unknown for an unrecognized path", () => {
    expect(parseContext7Request("/refresh", new URLSearchParams())).toEqual({ kind: "unknown" });
  });
});
