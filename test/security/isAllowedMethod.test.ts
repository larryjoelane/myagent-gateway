import { describe, expect, it } from "vitest";
import { isAllowedMethod } from "../../src/security/isAllowedMethod.ts";

describe("isAllowedMethod", () => {
  it("allows GET", () => {
    expect(isAllowedMethod("GET")).toBe(true);
  });

  it("allows HEAD", () => {
    expect(isAllowedMethod("HEAD")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAllowedMethod("get")).toBe(true);
  });

  it("rejects PUT", () => {
    expect(isAllowedMethod("PUT")).toBe(false);
  });

  it("rejects POST", () => {
    expect(isAllowedMethod("POST")).toBe(false);
  });

  it("rejects DELETE", () => {
    expect(isAllowedMethod("DELETE")).toBe(false);
  });
});
