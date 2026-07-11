const ALLOWED_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/** This proxy is read-only: it never forwards writes (publish/unpublish/etc) upstream. */
export function isAllowedMethod(method: string): boolean {
  return ALLOWED_METHODS.has(method.toUpperCase());
}
