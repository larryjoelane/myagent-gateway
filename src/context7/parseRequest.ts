import type { Context7Request, GetContextParams, SearchLibraryParams } from "./types.ts";

/** Parses an incoming proxy request path + query string into a Context7 operation. */
export function parseContext7Request(pathname: string, searchParams: URLSearchParams): Context7Request {
  if (pathname === "/search") {
    const libraryName = searchParams.get("libraryName");
    if (!libraryName) {
      return { kind: "unknown" };
    }
    return { kind: "search", params: buildSearchParams(libraryName, searchParams) };
  }

  if (pathname === "/docs") {
    const libraryId = searchParams.get("libraryId");
    if (!libraryId) {
      return { kind: "unknown" };
    }
    return { kind: "docs", params: buildDocsParams(libraryId, searchParams) };
  }

  return { kind: "unknown" };
}

function buildSearchParams(libraryName: string, searchParams: URLSearchParams): SearchLibraryParams {
  const query = searchParams.get("query");
  return query ? { libraryName, query } : { libraryName };
}

function buildDocsParams(libraryId: string, searchParams: URLSearchParams): GetContextParams {
  const query = searchParams.get("query");
  const type = searchParams.get("type");
  return {
    libraryId,
    ...(query ? { query } : {}),
    ...(type ? { type } : {}),
  };
}
