export interface TokenValidationConfig {
  readonly issuer: string;
  readonly audience: string;
}

export type TokenValidationResult =
  | { readonly valid: true; readonly claims: Record<string, unknown> }
  | { readonly valid: false; readonly reason: string };
