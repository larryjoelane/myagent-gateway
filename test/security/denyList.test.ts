import { describe, expect, it } from "vitest";
import { checkDenyList, type DenyListEntry } from "../../src/security/denyList.ts";

const entries: readonly DenyListEntry[] = [
  { packageName: "evil-pkg", version: "*", reason: "known malware" },
  { packageName: "flaky-pkg", version: "1.0.0", reason: "compromised release" },
];

describe("checkDenyList", () => {
  it("blocks every version of a wildcard entry", () => {
    expect(checkDenyList(entries, "evil-pkg", "1.2.3")).toEqual({ blocked: true, reason: "known malware" });
  });

  it("blocks only the specified version", () => {
    expect(checkDenyList(entries, "flaky-pkg", "1.0.0")).toEqual({
      blocked: true,
      reason: "compromised release",
    });
  });

  it("allows other versions of a version-pinned entry", () => {
    expect(checkDenyList(entries, "flaky-pkg", "1.0.1")).toEqual({ blocked: false });
  });

  it("allows packages not on the list", () => {
    expect(checkDenyList(entries, "fine-pkg", "1.0.0")).toEqual({ blocked: false });
  });
});
