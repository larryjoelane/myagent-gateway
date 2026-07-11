import { describe, expect, it } from "vitest";
import { resolveCorsOrigin, buildCorsHeaders } from "../../src/security/cors.ts";

const allowed = ["http://127.0.0.1:5173", "http://localhost:5173"];

describe("resolveCorsOrigin", () => {
  it("echoes an allow-listed origin", () => {
    expect(resolveCorsOrigin("http://127.0.0.1:5173", allowed)).toEqual({
      allowedOrigin: "http://127.0.0.1:5173",
    });
  });

  it("rejects an origin not on the list", () => {
    expect(resolveCorsOrigin("https://evil.example.com", allowed)).toEqual({ allowedOrigin: null });
  });

  it("rejects a missing origin", () => {
    expect(resolveCorsOrigin(null, allowed)).toEqual({ allowedOrigin: null });
  });

  it("rejects everything when the allow-list is empty", () => {
    expect(resolveCorsOrigin("http://127.0.0.1:5173", [])).toEqual({ allowedOrigin: null });
  });
});

describe("buildCorsHeaders", () => {
  it("builds headers scoped to the given origin, never wildcard", () => {
    const headers = buildCorsHeaders("http://127.0.0.1:5173");
    expect(headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
    expect(headers["access-control-allow-origin"]).not.toBe("*");
    expect(headers["vary"]).toBe("Origin");
  });

  it("advertises the methods the gateway actually allows", () => {
    const headers = buildCorsHeaders("http://127.0.0.1:5173");
    expect(headers["access-control-allow-methods"]).toContain("GET");
    expect(headers["access-control-allow-headers"]).toContain("authorization");
  });
});
