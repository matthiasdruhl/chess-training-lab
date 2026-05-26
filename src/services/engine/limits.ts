import { DEFAULT_DEPTH, DEFAULT_MOVETIME_MS } from '../../constants/engine';
import type { GoLimits } from '../../types/engine';

export type ResolvedGoLimits = { depth?: number; movetime?: number };

/**
 * Resolve UCI `go` parameters. Precedence: request depth → request movetime →
 * fallback depth → fallback movetime → default movetime (never both depth and movetime).
 */
export function resolveGoLimits(
  limits: GoLimits = {},
  fallback: GoLimits = { movetime: DEFAULT_MOVETIME_MS },
): ResolvedGoLimits {
  if (limits.depth !== undefined) {
    return { depth: limits.depth };
  }
  if (limits.movetime !== undefined) {
    return { movetime: limits.movetime };
  }
  if (fallback.depth !== undefined) {
    return { depth: fallback.depth };
  }
  if (fallback.movetime !== undefined) {
    return { movetime: fallback.movetime };
  }
  return { movetime: DEFAULT_MOVETIME_MS };
}

/** Default interactive analysis limits — movetime-only; callers pass `{ depth }` explicitly when needed. */
export function defaultMovetimeLimits(movetimeMs: number = DEFAULT_MOVETIME_MS): GoLimits {
  return { movetime: movetimeMs };
}

/** Explicit depth limit helper for callers that prefer fixed-depth search. */
export function depthLimits(depth: number = DEFAULT_DEPTH): GoLimits {
  return { depth };
}
