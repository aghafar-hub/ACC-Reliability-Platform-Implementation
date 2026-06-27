// platform/kernel/src/events/null-event-bus.ts
//
// NullEventBus — the Phase 1 no-op IEventBus implementation.
//
// All methods are safe stubs:
//   publish()         → no-op (no subscribers notified)
//   subscribe()       → returns a valid EventSubscription with a no-op unsubscribe
//   unsubscribeAll()  → no-op
//   listChannels()    → always returns an empty array
//   reset()           → no-op
//
// Replace this class with a real implementation in Phase 9 (Event Bus milestone).
// The replacement is a drop-in: register it under the same service id
// ('platform.eventBus') and all callers resolve the real bus automatically.

import type {
  IEventBus,
  IEventHandler,
  EventSubscription,
  EventChannelInfo,
} from './event-bus-types';
import type { EventToken } from './event-token';

export class NullEventBus implements IEventBus {
  private nextId = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  publish<T>(_token: EventToken<T>, _payload: T): void {
    // No-op: real event dispatch is a Phase 9 concern.
  }

  subscribe<T>(token: EventToken<T>, _handler: IEventHandler<T>): EventSubscription {
    this.nextId += 1;
    const subscriptionId = `null-sub-${this.nextId}`;

    const subscription: EventSubscription = {
      tokenName:      token.name,
      subscriptionId,
      subscribedAt:   new Date().toISOString(),
      unsubscribe:    () => { /* no-op: NullEventBus holds no subscriber state */ },
    };

    return subscription;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unsubscribeAll<T>(_token: EventToken<T>): void {
    // No-op.
  }

  listChannels(): ReadonlyArray<EventChannelInfo> {
    return [];
  }

  reset(): void {
    // No-op.
  }
}
