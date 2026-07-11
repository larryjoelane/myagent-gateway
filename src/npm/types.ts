export interface NpmDist {
  readonly tarball: string;
  readonly shasum?: string;
  readonly integrity?: string;
}

export interface NpmVersionManifest {
  readonly name: string;
  readonly version: string;
  readonly dist: NpmDist;
  readonly [key: string]: unknown;
}

export interface NpmPackument {
  readonly name: string;
  readonly "dist-tags": Readonly<Record<string, string>>;
  readonly versions: Readonly<Record<string, NpmVersionManifest>>;
  readonly [key: string]: unknown;
}

export type ParsedNpmRequest =
  | { readonly kind: "packument"; readonly packageName: string }
  | { readonly kind: "version"; readonly packageName: string; readonly version: string }
  | { readonly kind: "tarball"; readonly packageName: string; readonly fileName: string }
  | { readonly kind: "unknown" };
