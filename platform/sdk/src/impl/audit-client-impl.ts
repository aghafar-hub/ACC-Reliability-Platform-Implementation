// platform/sdk/src/impl/audit-client-impl.ts
// Concrete IAuditClient — bridges SDK AuditRequest → service AuditRequest.
//
// Mapping rules:
//   eventCategory → service category (see CATEGORY_MAP below)
//   eventType     → action (open union; passed through as-is)
//   result        → outcome (same values: success / failure / denied)
//   entityType + entityId → resource (module defaults to 'platform')
//   remarks       → description
//   previousValue → beforeValue
//   newValue      → afterValue
//   actor         → derived from SdkContext.currentUser
//   correlationId → createCorrelationId(correlationId) if supplied

import type {
  AuditActor,
  AuditCategory,
  AuditEntry,
  AuditOutcome,
  AuditQuery,
  AuditResource,
  AuditTimeline,
  IAuditService,
} from '@acc-reliability/services';
import { createCorrelationId } from '@acc-reliability/services';
import type {
  AuditEventCategory,
  AuditRequest as SdkAuditRequest,
  IAuditClient,
} from '../clients/audit-client';
import type { SdkContext } from '../sdk-context';

// ── Category mapping ──────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<AuditEventCategory, AuditCategory> = {
  auth:     'auth',
  admin:    'data',
  platform: 'system',
  business: 'data',
  security: 'security',
};

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Audit client backed by the in-memory {@link IAuditService}.
 *
 * Bridges the SDK-level {@link SdkAuditRequest} shape (optimised for module
 * ergonomics) to the richer service-level `AuditRequest` (which includes actor,
 * resource, and outcome fields).  The actor is always derived from the SDK
 * session context; modules never supply actor data directly.
 */
export class AuditClientImpl implements IAuditClient {
  constructor(
    private readonly service: IAuditService,
    private readonly context: SdkContext,
  ) {}

  query(filter: AuditQuery): readonly AuditEntry[] {
    return this.service.query(filter);
  }

  count(filter?: AuditQuery): number {
    return this.service.count(filter);
  }

  getTimeline(entityType: string, entityId: string, limit?: number): AuditTimeline {
    return this.service.getTimeline(entityType, entityId, limit);
  }

  async write(entry: SdkAuditRequest): Promise<void> {
    const { currentUser } = this.context;

    const actor: AuditActor = {
      userId:       currentUser.userId,
      contractorId: currentUser.contractorId,
      sessionId:    currentUser.sessionId,
    };

    const resource: AuditResource = {
      module:     'platform',
      entityType: entry.entityType,
      ...(entry.entityId !== undefined ? { entityId: entry.entityId } : {}),
    };

    const outcome: AuditOutcome = entry.result;

    // Build the service request using spread-conditionals to satisfy
    // exactOptionalPropertyTypes (no field is set to undefined).
    this.service.record({
      category:     CATEGORY_MAP[entry.eventCategory],
      action:       entry.eventType,
      outcome,
      actor,
      resource,
      ...(entry.correlationId !== undefined
        ? { correlationId: createCorrelationId(entry.correlationId) }
        : {}),
      ...(entry.remarks !== undefined
        ? { description: entry.remarks }
        : {}),
      ...(entry.previousValue !== undefined
        ? { beforeValue: entry.previousValue }
        : {}),
      ...(entry.newValue !== undefined
        ? { afterValue: entry.newValue }
        : {}),
      ...(entry.parentAuditId !== undefined
        ? { metadata: { parentAuditId: entry.parentAuditId } }
        : {}),
    });
  }
}
