// platform/kernel/src/events/local-event-bus.ts
//
// LocalEventBus — in-process synchronous event bus for platform integration.
//
// Handlers are invoked inline in subscription order. Errors in one handler are
// caught and logged; remaining handlers still execute.

import type {
  IEventBus,
  IEventHandler,
  EventSubscription,
  EventChannelInfo,
} from './event-bus-types';
import type { EventToken } from './event-token';

interface SubscriptionEntry<T = unknown> {
  readonly subscriptionId: string;
  readonly subscribedAt: string;
  readonly handler: IEventHandler<T>;
}

export class LocalEventBus implements IEventBus {
  private readonly channels = new Map<string, SubscriptionEntry[]>();
  private nextId = 0;

  publish<T>(token: EventToken<T>, payload: T): void {
    const entries = this.channels.get(token.name);
    if (entries === undefined || entries.length === 0) return;

    for (const entry of [...entries]) {
      try {
        (entry.handler as IEventHandler<T>)(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[LocalEventBus] Handler error on '${token.name}': ${message}`);
      }
    }
  }

  subscribe<T>(token: EventToken<T>, handler: IEventHandler<T>): EventSubscription {
    this.nextId += 1;
    const subscriptionId = `local-sub-${this.nextId}`;
    const subscribedAt = new Date().toISOString();

    const entry: SubscriptionEntry<T> = {
      subscriptionId,
      subscribedAt,
      handler,
    };

    const existing = this.channels.get(token.name) ?? [];
    existing.push(entry as SubscriptionEntry);
    this.channels.set(token.name, existing);

    return {
      tokenName: token.name,
      subscriptionId,
      subscribedAt,
      unsubscribe: () => {
        const list = this.channels.get(token.name);
        if (list === undefined) return;
        const idx = list.findIndex((e) => e.subscriptionId === subscriptionId);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) this.channels.delete(token.name);
      },
    };
  }

  unsubscribeAll<T>(token: EventToken<T>): void {
    this.channels.delete(token.name);
  }

  listChannels(): ReadonlyArray<EventChannelInfo> {
    const result: EventChannelInfo[] = [];
    for (const [tokenName, entries] of this.channels.entries()) {
      if (entries.length === 0) continue;
      const first = entries.reduce((earliest, e) =>
        e.subscribedAt < earliest ? e.subscribedAt : earliest,
      entries[0]?.subscribedAt ?? '');
      result.push({
        tokenName,
        subscriberCount: entries.length,
        firstSubscribedAt: first,
      });
    }
    return result;
  }

  reset(): void {
    this.channels.clear();
  }
}
