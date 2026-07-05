// apps/owner-center/src/components/ui-v2/Panel.tsx
// Premium card container — replaces SectionCard visually within UI-V2 scope only.

import React from 'react';
import { cn } from './types';

export interface PanelProps {
  readonly title: string;
  readonly action?: React.ReactNode;
  readonly empty?: boolean;
  readonly emptyLabel?: string;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly children?: React.ReactNode;
}

export function Panel({
  title,
  action,
  empty = false,
  emptyLabel = '—',
  className,
  bodyClassName,
  children,
}: PanelProps): React.ReactElement {
  return (
    <section className={cn('accv2-panel', className)}>
      <header className="accv2-panel__header">
        <h2 className="accv2-panel__title">{title}</h2>
        {action}
      </header>
      <div className={cn('accv2-panel__body', bodyClassName)}>
        {empty ? <p className="accv2-panel__empty">{emptyLabel}</p> : children}
      </div>
    </section>
  );
}
