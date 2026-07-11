export interface IntegrityCheckInput {
  readonly expectedShasum: string | undefined;
  readonly actualShasumHex: string;
}

export type IntegrityResult = { readonly valid: true } | { readonly valid: false; readonly reason: string };

/** Compares a computed sha1 digest against the registry-declared shasum. Pure. */
export function verifyShasum(input: IntegrityCheckInput): IntegrityResult {
  if (!input.expectedShasum) {
    return { valid: false, reason: "upstream did not declare a shasum" };
  }

  if (input.expectedShasum.toLowerCase() !== input.actualShasumHex.toLowerCase()) {
    return {
      valid: false,
      reason: `shasum mismatch: expected ${input.expectedShasum}, got ${input.actualShasumHex}`,
    };
  }

  return { valid: true };
}
