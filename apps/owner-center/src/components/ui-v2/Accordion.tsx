// apps/owner-center/src/components/ui-v2/Accordion.tsx
// Desktop: always-expanded Panel. Mobile: native <details> accordion,
// collapsed by default — keeps secondary zones out of the way on small screens.

import React from 'react';
import { Panel } from './Panel';
import { cn } from './types';

export interface AccordionProps {
  readonly title: string;
  readonly isMobile: boolean;
  readonly className?: string;
  readonly children: React.ReactNode;
}

export function Accordion({ title, isMobile, className, children }: AccordionProps): React.ReactElement {
  if (isMobile) {
    return (
      <details className={cn('accv2-accordion', className)}>
        <summary>{title}</summary>
        <div className="accv2-accordion__body">{children}</div>
      </details>
    );
  }
  return (
    <Panel title={title} className={className}>
      {children}
    </Panel>
  );
}
