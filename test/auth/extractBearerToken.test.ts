import { describe, expect, it } from "vitest";
import { extractBearerToken } from "../../src/auth/extractBearerToken.ts";

describe("extractBearerToken", () => {
  it("extracts the token from a well-formed header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("is case-insensitive to the Bearer prefix", () => {
    expect(extractBearerToken("bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("returns null when the header is missing", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null when the header has no Bearer prefix", () => {
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
  });

  it("returns null for an empty token", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  it("tolerates surrounding whitespace", () => {
    expect(extractBearerToken("  Bearer abc.def.ghi  ")).toBe("abc.def.ghi");
  });
});
