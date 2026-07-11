import type { Context7Request } from "./types.ts";

const CONTEXT7_BASE = "https://context7.com";

/** Builds the upstream Context7 REST API URL for a parsed request. */
export function buildContext7UpstreamUrl(request: Context7Request): string | null {
  switch (request.kind) {
    case "search": {
      const url = new URL(`${CONTEXT7_BASE}/api/v2/libs/search`);
      url.searchParams.set("libraryName", request.params.libraryName);
      if (request.params.query) url.searchParams.set("query", request.params.query);
      return url.toString();
    }
    case "docs": {
      const url = new URL(`${CONTEXT7_BASE}/api/v2/context`);
      url.searchParams.set("libraryId", request.params.libraryId);
      if (request.params.query) url.searchParams.set("query", request.params.query);
      if (request.params.type) url.searchParams.set("type", request.params.type);
      return url.toString();
    }
    case "unknown":
      return null;
  }
}
