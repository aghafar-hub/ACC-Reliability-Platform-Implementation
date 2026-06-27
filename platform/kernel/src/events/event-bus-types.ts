// platform/kernel/src/events/event-bus-types.ts
//
// Public types for the ACC Reliability Platform event bus.
//
// These interfaces define the event-driven communication contract at the kernel
// level. The actual event bus implementation belongs in Phase 9. Until then,
// NullEventBus satisfies this interface as a safe no-op placeholder.
//
// Design constraints (from AI_DEVELOPMENT_GUIDE.md):
//   - Direct module-to-module communication is prohibited.
//   - Prepare code for future event-driven architecture but do not implement it yet.
//   - All cross-module communication must flow through Platform Services.

import type { EventToken } from './event-token';

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * A synchronous event handler for events of payload type T.
 *
 * Handlers must not throw. Errors should be caught internally and either
 * logged or surfaced via the handler's own error-handling strategy.
 * The event bus guarantees continued delivery to remaining handlers even if
 * one misbehaves.
 */
export type IEventHandler<T> = (payload: T) => void;

// ── Subscription ──────────────────────────────────────────────────────────────

/**
 * A handle returned by IEventBus.subscribe().
 *
 * Callers must retain this object and call unsubscribe() to clean up
 * when the subscriber is no longer interested in events — especially
 * during module teardown.
 */
export interface EventSubscription {
  /** The channel (token name) this subscription is registered under. */
  readonly tokenName: string;
  /** Unique opaque identifier for this specific subscription. */
  readonly subscriptionId: string;
  /** ISO 8601 — when this subscription was created. */
  readonly subscribedAt: string;
  /** Removes this subscription from the event bus. Safe to call multiple times. */
  unsubscribe(): void;
}

// ── Channel info ──────────────────────────────────────────────────────────────

/**
 * Public metadata for a registered event channel.
 * No handler references or payload data are exposed.
 * Returned by IEventBus.listChannels() for diagnostics.
 */
export interface EventChannelInfo {
  /** Token name identifying this channel. */
  readonly tokenName: string;
  /** Number of active subscriptions on this channel. */
  readonly subscriberCount: number;
  /** ISO 8601 — when the first subscription was added to this channel. */
  readonly firstSubscribedAt?: string;
}

// ── Event Bus interface ───────────────────────────────────────────────────────

/**
 * Platform event bus contract.
 *
 * Current kernel implementation: NullEventBus (Phase 1 — no-op placeholder).
 * Production implementation: Phase 9 introduces a real in-process event bus.
 *
 * Publish/subscribe rules:
 * - publish() is synchronous; handlers are called inline in subscription order.
 * - If a handler throws, the error is caught and logged; remaining handlers
 *   still execute — one bad handler never silences others.
 * - Events are ephemeral (no persistence, no replay).
 * - Modules must never call publish() to address another module directly.
 *   Cross-module events must flow through Platform Services.
 */
export interface IEventBus {
  /**
   * Publishes an event to all current subscribers of the given channel.
   * If no subscribers exist the call is a no-op.
   */
  publish<T>(token: EventToken<T>, payload: T): void;

  /**
   * Subscribes a handler to the event channel identified by token.
   * Returns an EventSubscription — call its unsubscribe() to clean up.
   */
  subscribe<T>(token: EventToken<T>, handler: IEventHandler<T>): EventSubscription;

  /**
   * Removes all subscriptions for the given channel in one call.
   * Use during module teardown when individual subscriptions were not retained.
   */
  unsubscribeAll<T>(token: EventToken<T>): void;

  /**
   * Returns public metadata for all channels that have at least one subscriber.
   * No handler references or payload data are included.
   */
  listChannels(): ReadonlyArray<EventChannelInfo>;

  /**
   * Removes all subscriptions from every channel.
   * Intended for test teardown only — not for production use.
   */
  reset(): void;
}
