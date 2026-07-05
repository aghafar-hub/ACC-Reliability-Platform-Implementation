// apps/owner-center/src/components/ui/Dialog.tsx
// Modal dialog — confirm, warning, duplicate detection, and large forms.

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './types';
import type { DialogVariant } from './types';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: DialogVariant;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = 'default',
  footer,
  size = 'md',
  closeOnBackdrop = true,
  className,
}: DialogProps): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="acc-dialog" role="presentation">
      <button
        type="button"
        className="acc-dialog__backdrop"
        aria-label="Close dialog"
        onClick={closeOnBackdrop ? onClose : undefined}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className={cn(
          'acc-dialog__panel',
          `acc-dialog__panel--${size}`,
          `acc-dialog__panel--${variant}`,
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="acc-dialog-title"
        tabIndex={-1}
      >
        <header className={cn('acc-dialog__header', `acc-dialog__header--${variant}`)}>
          {variant === 'warning' && (
            <span className="acc-dialog__variant-icon" aria-hidden="true">⚠</span>
          )}
          {variant === 'duplicate' && (
            <span className="acc-dialog__variant-icon" aria-hidden="true">⧉</span>
          )}
          <h2 id="acc-dialog-title" className="acc-dialog__title">{title}</h2>
          <button type="button" className="acc-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="acc-dialog__body">{children}</div>
        {footer && <footer className="acc-dialog__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'confirm' | 'warning';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'confirm',
}: ConfirmDialogProps): React.ReactElement {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      variant={variant}
      size="sm"
      footer={
        <>
          <button type="button" className="acc-btn acc-btn--ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn('acc-btn', variant === 'warning' ? 'acc-btn--danger' : 'acc-btn--primary')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="acc-dialog__message">{message}</p>
    </Dialog>
  );
}
