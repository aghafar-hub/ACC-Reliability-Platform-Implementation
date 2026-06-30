// apps/owner-center/src/components/SearchButton.tsx
// Header button that opens the command palette.
// Displays a bilingual label and the Ctrl+K keyboard hint.
// No state, no data — pure presentational trigger.

import React from 'react';
import type { LocaleCode } from '../types/app-types';

interface SearchButtonProps {
  readonly locale: LocaleCode;
  readonly onOpen: () => void;
}

const COPY = {
  label: { en: 'Search', ar: 'بحث' },
  hint:  'Ctrl+K',
} as const;

export function SearchButton({ locale, onOpen }: SearchButtonProps): React.ReactElement {
  const isAr = locale === 'ar';

  return (
    <button
      type="button"
      className="search-btn"
      onClick={onOpen}
      aria-label={isAr ? COPY.label.ar : COPY.label.en}
      aria-keyshortcuts="Control+k"
    >
      <span className="search-btn__icon" aria-hidden="true">⌕</span>
      <span className="search-btn__label">
        {isAr ? COPY.label.ar : COPY.label.en}
      </span>
      <kbd className="search-btn__kbd">{COPY.hint}</kbd>
    </button>
  );
}
