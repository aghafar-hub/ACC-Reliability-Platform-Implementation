// platform/services/src/contractor/contractor-event-tokens.ts
// Typed EventToken constants for the Contractor Management domain.
//
// Each token names an event channel on the platform IEventBus.
// Import the token at both the publish site (ContractorService) and any
// subscription site to ensure both sides reference the same channel.
//
// Current bus: NullEventBus (Phase 1 — no-op).
// Real delivery: Phase 9 event bus milestone.

import { EventToken } from '@acc-reliability/kernel';

import type {
  ContractorCreatedPayload,
  ContractorUpdatedPayload,
  ContractorArchivedPayload,
  ContractorRestoredPayload,
  ContractorActivatedPayload,
  ContractorDeactivatedPayload,
} from '../contracts/platform-events';

/** Published when a new contractor record is created. */
export const CONTRACTOR_CREATED_TOKEN =
  new EventToken<ContractorCreatedPayload>('platform.contractors.contractor.created');

/** Published when a contractor record profile is updated. */
export const CONTRACTOR_UPDATED_TOKEN =
  new EventToken<ContractorUpdatedPayload>('platform.contractors.contractor.updated');

/** Published when a contractor record is archived. */
export const CONTRACTOR_ARCHIVED_TOKEN =
  new EventToken<ContractorArchivedPayload>('platform.contractors.contractor.archived');

/** Published when an archived contractor is restored to active status. */
export const CONTRACTOR_RESTORED_TOKEN =
  new EventToken<ContractorRestoredPayload>('platform.contractors.contractor.restored');

/** Published when an inactive contractor is activated. */
export const CONTRACTOR_ACTIVATED_TOKEN =
  new EventToken<ContractorActivatedPayload>('platform.contractors.contractor.activated');

/** Published when an active contractor is deactivated. */
export const CONTRACTOR_DEACTIVATED_TOKEN =
  new EventToken<ContractorDeactivatedPayload>('platform.contractors.contractor.deactivated');
