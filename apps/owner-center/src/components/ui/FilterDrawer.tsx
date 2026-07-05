// apps/owner-center/src/components/ui/FilterDrawer.tsx
// Mobile filter panel with apply, clear, and close actions.

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './types';

export interface FilterDrawerProps {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  applyLabel?: string;
  clearLabel?: string;
  closeLabel?: string;
  activeFilterCount?: number;
}

export function FilterDrawer({
  open,
  title = 'Filters',
  children,
  onClose,
  onApply,
  onClear,
  applyLabel = 'Apply',
  clearLabel = 'Clear',
  closeLabel = 'Close',
  activeFilterCount = 0,
}: FilterDrawerProps): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="acc-filter-drawer" role="presentation">
      <button
        type="button"
        className="acc-filter-drawer__backdrop"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="acc-filter-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="acc-filter-drawer__header">
          <h2 className="acc-filter-drawer__title">{title}</h2>
          {activeFilterCount > 0 && (
            <span className="acc-filter-drawer__count">{activeFilterCount}</span>
          )}
          <button type="button" className="acc-filter-drawer__close" onClick={onClose}>
            {closeLabel}
          </button>
        </header>
        <div className="acc-filter-drawer__body">{children}</div>
        <footer className="acc-filter-drawer__footer">
          <button type="button" className="acc-btn acc-btn--ghost" onClick={onClear}>
            {clearLabel}
          </button>
          <button type="button" className="acc-btn acc-btn--primary" onClick={onApply}>
            {applyLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
