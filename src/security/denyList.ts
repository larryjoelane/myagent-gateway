export interface DenyListEntry {
  readonly packageName: string;
  /** Exact version to block, or "*" to block every version of the package. */
  readonly version: string;
  readonly reason: string;
}

export interface DenyListMatch {
  readonly blocked: true;
  readonly reason: string;
}

export interface DenyListClear {
  readonly blocked: false;
}

export type DenyListResult = DenyListMatch | DenyListClear;

/** Checks a package/version pair against a static deny-list. Pure — no I/O. */
export function checkDenyList(
  entries: readonly DenyListEntry[],
  packageName: string,
  version: string | null,
): DenyListResult {
  const match = entries.find(
    (entry) =>
      entry.packageName === packageName && (entry.version === "*" || entry.version === version),
  );

  return match ? { blocked: true, reason: match.reason } : { blocked: false };
}
