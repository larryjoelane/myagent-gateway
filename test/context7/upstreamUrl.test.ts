import { describe, expect, it } from "vitest";
import { buildContext7UpstreamUrl } from "../../src/context7/upstreamUrl.ts";

describe("buildContext7UpstreamUrl", () => {
  it("builds a search url", () => {
    const result = buildContext7UpstreamUrl({
      kind: "search",
      params: { libraryName: "react", query: "hooks" },
    });
    expect(result).toBe("https://context7.com/api/v2/libs/search?libraryName=react&query=hooks");
  });

  it("builds a search url without a query", () => {
    const result = buildContext7UpstreamUrl({ kind: "search", params: { libraryName: "react" } });
    expect(result).toBe("https://context7.com/api/v2/libs/search?libraryName=react");
  });

  it("builds a docs url", () => {
    const result = buildContext7UpstreamUrl({
      kind: "docs",
      params: { libraryId: "/facebook/react", query: "hooks", type: "json" },
    });
    expect(result).toBe(
      "https://context7.com/api/v2/context?libraryId=%2Ffacebook%2Freact&query=hooks&type=json",
    );
  });

  it("returns null for unknown requests", () => {
    expect(buildContext7UpstreamUrl({ kind: "unknown" })).toBeNull();
  });
});
