// apps/owner-center/src/hooks/useCommandPalette.ts
// Command palette state + global Ctrl+K shortcut.
//
// Search results are derived exclusively from NAV_ITEMS (navigation metadata).
// No API calls, no business data, no async.  Module search providers will be
// registered lazily in future patches via the SearchProvider interface.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { NAV_ITEMS } from '../types/navigation-types';
import type { SearchItem } from '../types/search-types';

// ── Static nav search items — built once at module load ───────────────────────
// Only navigation metadata; no business data loaded here.

const NAV_SEARCH_ITEMS: readonly SearchItem[] = NAV_ITEMS.map((item) => ({
  id: `nav:${item.path}`,
  category: 'navigation' as const,
  label: item.label,
  icon: item.icon,
  path: item.path,
}));

// ── Filtering — pure function, no async ──────────────────────────────────────

function filterItems(query: string): readonly SearchItem[] {
  const q = query.trim().toLowerCase();
  if (q === '') return NAV_SEARCH_ITEMS;
  return NAV_SEARCH_ITEMS.filter(
    (item) =>
      item.label.en.toLowerCase().includes(q) ||
      item.label.ar.includes(q),
  );
}

// ── Hook public surface ───────────────────────────────────────────────────────

export interface CommandPaletteState {
  readonly isOpen: boolean;
  readonly query: string;
  readonly results: readonly SearchItem[];
  readonly selectedIndex: number;
  readonly open: () => void;
  readonly close: () => void;
  readonly setQuery: (q: string) => void;
  readonly setSelectedIndex: (i: number) => void;
}

export function useCommandPalette(): CommandPaletteState {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQueryState] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => filterItems(query), [query]);

  const open = useCallback(() => {
    setQueryState('');
    setSelectedIndex(0);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQueryState('');
    setSelectedIndex(0);
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setSelectedIndex(0);
  }, []);

  // Global Ctrl+K / Cmd+K — toggle palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, open, close]);

  return { isOpen, query, results, selectedIndex, open, close, setQuery, setSelectedIndex };
}
