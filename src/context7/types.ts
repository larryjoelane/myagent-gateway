export interface SearchLibraryParams {
  readonly libraryName: string;
  readonly query?: string;
}

export interface GetContextParams {
  readonly libraryId: string;
  readonly query?: string;
  readonly type?: string;
}

export type Context7Request =
  | { readonly kind: "search"; readonly params: SearchLibraryParams }
  | { readonly kind: "docs"; readonly params: GetContextParams }
  | { readonly kind: "unknown" };
