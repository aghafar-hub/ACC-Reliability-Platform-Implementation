// apps/owner-center/src/types/search-types.ts
// Search and command palette type definitions.
//
// SearchProvider is the extension point: future modules register a provider
// that returns SearchItem[] for a given query.  Providers load lazily — they
// are never imported on startup, only when the palette is first opened.

// ── Primitives ────────────────────────────────────────────────────────────────

/** Broad group a search result belongs to. */
export type SearchCategory = 'navigation' | 'command' | 'module';

// ── Core types ────────────────────────────────────────────────────────────────

/**
 * A single result shown in the command palette.
 * `path` is set for navigation items; `action` for command items.
 * Exactly one of the two should be provided.
 */
export interface SearchItem {
  readonly id: string;
  readonly category: SearchCategory;
  readonly label: { readonly en: string; readonly ar: string };
  readonly description?: { readonly en: string; readonly ar: string };
  readonly icon?: string;
  readonly path?: string;
  readonly action?: () => void;
}

/**
 * A callable command entry (no route navigation — triggers a side effect).
 * Commands are converted to SearchItem before display.
 */
export interface CommandAction {
  readonly id: string;
  readonly label: { readonly en: string; readonly ar: string };
  readonly description?: { readonly en: string; readonly ar: string };
  readonly icon?: string;
  readonly execute: () => void;
}

/**
 * Future module search integration point.
 * Each module registers a provider; providers are loaded lazily and never
 * called on startup.  For now this interface is defined but not wired.
 */
export interface SearchProvider {
  readonly id: string;
  readonly label: string;
  readonly provide: (query: string) => readonly SearchItem[];
}
