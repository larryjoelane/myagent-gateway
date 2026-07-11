import { describe, expect, it } from "vitest";
import { resolveSurface } from "../../src/routing/resolveSurface.ts";

const hostnames = { registry: "registry.larrylane.dev", context7: "context7.larrylane.dev" };

describe("resolveSurface", () => {
  it("resolves the registry hostname", () => {
    expect(resolveSurface("registry.larrylane.dev", hostnames)).toBe("registry");
  });

  it("resolves the context7 hostname", () => {
    expect(resolveSurface("context7.larrylane.dev", hostnames)).toBe("context7");
  });

  it("returns unrecognized for any other hostname", () => {
    expect(resolveSurface("evil.example.com", hostnames)).toBe("unrecognized");
  });

  it("is case-sensitive to the exact configured hostname", () => {
    expect(resolveSurface("REGISTRY.larrylane.dev", hostnames)).toBe("unrecognized");
  });
});
