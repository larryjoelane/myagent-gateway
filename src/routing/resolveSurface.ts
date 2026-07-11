export type Surface = "registry" | "context7" | "unrecognized";

export interface SurfaceHostnames {
  readonly registry: string;
  readonly context7: string;
}

/** Maps a request hostname to the gateway surface that should handle it. Pure. */
export function resolveSurface(hostname: string, hostnames: SurfaceHostnames): Surface {
  if (hostname === hostnames.registry) return "registry";
  if (hostname === hostnames.context7) return "context7";
  return "unrecognized";
}
