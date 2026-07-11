import { describe, expect, it } from "vitest";
import { verifyShasum } from "../../src/security/verifyIntegrity.ts";

describe("verifyShasum", () => {
  it("passes when digests match case-insensitively", () => {
    expect(verifyShasum({ expectedShasum: "ABC123", actualShasumHex: "abc123" })).toEqual({ valid: true });
  });

  it("fails when digests differ", () => {
    const result = verifyShasum({ expectedShasum: "abc123", actualShasumHex: "def456" });
    expect(result.valid).toBe(false);
  });

  it("fails when no expected shasum was declared", () => {
    const result = verifyShasum({ expectedShasum: undefined, actualShasumHex: "abc123" });
    expect(result.valid).toBe(false);
  });
});
