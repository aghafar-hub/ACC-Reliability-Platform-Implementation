// apps/owner-center/src/components/ui/Timeline.tsx
// Combined event timeline — horizontal on desktop, scrollable vertical on mobile.

import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { StatusBadge } from './StatusBadge';
import { useIsMobile } from './hooks/useBreakpoint';
import { cn } from './types';
import type { TimelineEvent } from './types';

export interface TimelineProps {
  events: TimelineEvent[];
  direction?: 'horizontal' | 'vertical' | 'auto';
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
  emptyLabel?: string;
}

const KIND_LABELS: Record<TimelineEvent['kind'], string> = {
  sample: 'Sample',
  'oil-change': 'Oil Change',
  future: 'Planned',
  custom: 'Event',
};

export function Timeline({
  events,
  direction = 'auto',
  onEventClick,
  className,
  emptyLabel = 'No timeline events',
}: TimelineProps): React.ReactElement {
  const isMobile = useIsMobile();
  const layout = direction === 'auto' ? (isMobile ? 'vertical' : 'horizontal') : direction;
  const [selected, setSelected] = useState<TimelineEvent | null>(null);

  const handleClick = (event: TimelineEvent): void => {
    if (onEventClick) {
      onEventClick(event);
    } else if (event.detail) {
      setSelected(event);
    }
  };

  if (events.length === 0) {
    return <p className={cn('acc-timeline__empty', className)}>{emptyLabel}</p>;
  }

  return (
    <>
      <div
        className={cn(
          'acc-timeline',
          `acc-timeline--${layout}`,
          className,
        )}
        role="list"
      >
        {events.map((event, index) => (
          <button
            key={event.id}
            type="button"
            className={cn(
              'acc-timeline__event',
              `acc-timeline__event--${event.kind}`,
              event.kind === 'future' && 'acc-timeline__event--future',
            )}
            style={event.color ? { '--acc-timeline-marker': event.color } as React.CSSProperties : undefined}
            onClick={() => handleClick(event)}
            role="listitem"
          >
            <span className="acc-timeline__marker" aria-hidden="true" />
            {index < events.length - 1 && (
              <span className="acc-timeline__connector" aria-hidden="true" />
            )}
            <span className="acc-timeline__date">{event.date}</span>
            <span className="acc-timeline__kind">{KIND_LABELS[event.kind]}</span>
            <span className="acc-timeline__label">{event.label}</span>
            {event.status && (
              <StatusBadge
                variant={event.status}
                label={event.statusLabel ?? event.label}
                size="sm"
                className="acc-timeline__badge"
              />
            )}
          </button>
        ))}
      </div>

      {selected?.detail && (
        <Dialog
          open={selected !== null}
          onClose={() => setSelected(null)}
          title={selected.label}
          size="sm"
        >
          {selected.detail}
        </Dialog>
      )}
    </>
  );
}
