export type Ecosystem = "npm" | "pypi" | "nuget" | "unrecognized";

export interface EcosystemRoute {
  readonly ecosystem: Ecosystem;
  /** The path with the /{ecosystem} prefix stripped, e.g. "/npm/left-pad" -> "/left-pad". */
  readonly remainingPath: string;
}

/** Splits a registry-surface path into its ecosystem prefix and the remaining path. Pure. */
export function resolveEcosystem(pathname: string): EcosystemRoute {
  const match = /^\/(npm|pypi|nuget)(\/.*)?$/.exec(pathname);
  if (!match) {
    return { ecosystem: "unrecognized", remainingPath: pathname };
  }
  const ecosystem = match[1] as Exclude<Ecosystem, "unrecognized">;
  const remainingPath = match[2] ?? "/";
  return { ecosystem, remainingPath };
}
