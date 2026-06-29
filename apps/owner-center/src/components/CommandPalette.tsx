// apps/owner-center/src/components/CommandPalette.tsx
// Global command palette modal.
//
// Keyboard navigation:
//   Esc          — close
//   ↑ / ↓        — move selection
//   Enter        — navigate to selected item
//   Click item   — navigate to selected item
//   Click overlay — close
//
// No API calls, no business data.  Results come from the parent hook.

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LocaleCode } from '../types/app-types';
import type { SearchItem } from '../types/search-types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly query: string;
  readonly results: readonly SearchItem[];
  readonly selectedIndex: number;
  readonly locale: LocaleCode;
  readonly onClose: () => void;
  readonly onQueryChange: (q: string) => void;
  readonly onSelectedIndexChange: (i: number) => void;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  dialogLabel:       { en: 'Search and commands',  ar: 'البحث والأوامر'     },
  placeholder:       { en: 'Search pages…',        ar: 'ابحث عن الصفحات…'   },
  noResults:         { en: 'No results found.',    ar: 'لا توجد نتائج.'      },
  categoryNav:       { en: 'Navigation',           ar: 'التنقل'              },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette({
  isOpen,
  query,
  results,
  selectedIndex,
  locale,
  onClose,
  onQueryChange,
  onSelectedIndexChange,
}: CommandPaletteProps): React.ReactElement | null {
  const isAr = locale === 'ar';
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input whenever the palette opens
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => { inputRef.current?.focus(); }, 0);
      return () => { clearTimeout(id); };
    }
    return undefined;
  }, [isOpen]);

  function confirmSelection(item: SearchItem): void {
    if (item.path !== undefined) {
      navigate(item.path);
      onClose();
    } else if (item.action !== undefined) {
      item.action();
      onClose();
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;

      case 'ArrowDown':
        e.preventDefault();
        onSelectedIndexChange(Math.min(selectedIndex + 1, results.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        onSelectedIndexChange(Math.max(selectedIndex - 1, 0));
        break;

      case 'Enter': {
        const item = results[selectedIndex];
        if (item !== undefined) confirmSelection(item);
        break;
      }

      default:
        break;
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="palette-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="palette-modal"
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? COPY.dialogLabel.ar : COPY.dialogLabel.en}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}
      >
        {/* Search input row */}
        <div className="palette-search">
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            value={query}
            onChange={(e) => { onQueryChange(e.target.value); }}
            onKeyDown={handleInputKeyDown}
            placeholder={isAr ? COPY.placeholder.ar : COPY.placeholder.en}
            aria-label={isAr ? COPY.placeholder.ar : COPY.placeholder.en}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="palette-esc-hint">Esc</kbd>
        </div>

        {/* Results */}
        <div className="palette-results" role="listbox">
          {results.length === 0 ? (
            <p className="palette-empty">
              {isAr ? COPY.noResults.ar : COPY.noResults.en}
            </p>
          ) : (
            <>
              <div className="palette-category-label" aria-hidden="true">
                {isAr ? COPY.categoryNav.ar : COPY.categoryNav.en}
              </div>

              {results.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={`palette-item${idx === selectedIndex ? ' palette-item--selected' : ''}`}
                  role="option"
                  aria-selected={idx === selectedIndex}
                  onClick={() => { confirmSelection(item); }}
                  onMouseEnter={() => { onSelectedIndexChange(idx); }}
                >
                  {item.icon !== undefined && (
                    <span className="palette-item__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="palette-item__label">
                    {isAr ? item.label.ar : item.label.en}
                  </span>
                  {idx === selectedIndex && (
                    <kbd className="palette-item__enter-hint" aria-hidden="true">↵</kbd>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
