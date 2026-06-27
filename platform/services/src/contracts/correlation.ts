// platform/services/src/contracts/correlation.ts
// Branded identifier primitives for cross-module message correlation and distributed tracing.
//
// Every platform message, event, request, and operation carries one or more of these
// identifiers.  They are the atomic tracing building-blocks for all communication contracts.
//
// Design:
//  - All types are branded strings — mixing them is a compile-time error.
//  - Factories reject blank values; the empty string is never a valid identifier.
//  - No runtime dependencies; this file has zero imports.

// ── Branded identifier types ──────────────────────────────────────────────────

/**
 * Ties related messages and events together across module boundaries.
 *
 * A single user action (e.g. "request oil change") may produce multiple
 * messages.  All of them share the same {@link CorrelationId} so the full
 * conversation can be reconstructed from logs.
 */
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };

/**
 * Unique identifier for a single platform message or command.
 * Every {@link PlatformMessage} envelope carries a distinct {@link MessageId}.
 */
export type MessageId = string & { readonly __brand: 'MessageId' };

/**
 * Unique identifier for a single request/response exchange.
 *
 * Used when a caller needs to match a response back to the originating
 * request in future request-reply messaging patterns.
 */
export type RequestId = string & { readonly __brand: 'RequestId' };

/**
 * Unique identifier for a single domain event.
 * Every {@link PlatformEvent} envelope carries a distinct {@link EventId}.
 */
export type EventId = string & { readonly __brand: 'EventId' };

/**
 * Opaque distributed trace identifier.
 *
 * Spans the full lifetime of a user-visible operation, potentially
 * crossing multiple modules, services, and asynchronous hops.
 * Compatible with OpenTelemetry trace-id conventions.
 */
export type TraceId = string & { readonly __brand: 'TraceId' };

/**
 * Identifies a single named operation within a larger trace.
 *
 * Where a {@link TraceId} covers an entire user journey, an
 * {@link OperationId} covers one logical step (e.g. "persist oil sample").
 */
export type OperationId = string & { readonly __brand: 'OperationId' };

// ── Factory functions ─────────────────────────────────────────────────────────

/**
 * Creates a {@link CorrelationId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createCorrelationId(value: string): CorrelationId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('CorrelationId cannot be empty');
  return trimmed as CorrelationId;
}

/**
 * Creates a {@link MessageId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createMessageId(value: string): MessageId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('MessageId cannot be empty');
  return trimmed as MessageId;
}

/**
 * Creates a {@link RequestId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createRequestId(value: string): RequestId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('RequestId cannot be empty');
  return trimmed as RequestId;
}

/**
 * Creates a {@link EventId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createEventId(value: string): EventId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('EventId cannot be empty');
  return trimmed as EventId;
}

/**
 * Creates a {@link TraceId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createTraceId(value: string): TraceId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('TraceId cannot be empty');
  return trimmed as TraceId;
}

/**
 * Creates a {@link OperationId} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createOperationId(value: string): OperationId {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('OperationId cannot be empty');
  return trimmed as OperationId;
}
