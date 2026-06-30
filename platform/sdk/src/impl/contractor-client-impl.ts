// platform/sdk/src/impl/contractor-client-impl.ts
// SDK bridge from IContractorClient → IContractorService.
//
// Derives the acting user (ActorRef) from the SdkContext so modules never
// supply their own actor — the platform always knows who is calling.

import type {
  ContractorId,
  IContractorService,
  ContractorRecord,
  ContractorRecordId,
  CreateContractorRequest,
  UpdateContractorRequest,
  ContractorListQuery,
  ContractorListResult,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { IContractorClient } from '../clients/contractor-client';

/**
 * Concrete SDK contractor client.
 *
 * Every mutating call passes `{ userId, contractorId }` derived from
 * `SdkContext.currentUser` as the `ActorRef`.  The underlying
 * `ContractorService` records this actor in the audit trail and domain events.
 */
export class ContractorClientImpl implements IContractorClient {
  constructor(
    private readonly service: IContractorService,
    private readonly context: SdkContext,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  create(request: CreateContractorRequest): ContractorRecord {
    return this.service.create(request, this.actor());
  }

  findById(id: ContractorRecordId): ContractorRecord | null {
    return this.service.findById(id);
  }

  findByCode(contractorCode: ContractorId): ContractorRecord | null {
    return this.service.findByCode(contractorCode);
  }

  list(query?: ContractorListQuery): ContractorListResult {
    return this.service.list(query);
  }

  update(id: ContractorRecordId, request: UpdateContractorRequest): ContractorRecord {
    return this.service.update(id, request, this.actor());
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  archive(id: ContractorRecordId, reason: string): ContractorRecord {
    return this.service.archive(id, reason, this.actor());
  }

  restore(id: ContractorRecordId): ContractorRecord {
    return this.service.restore(id, this.actor());
  }

  activate(id: ContractorRecordId): ContractorRecord {
    return this.service.activate(id, this.actor());
  }

  deactivate(id: ContractorRecordId, reason: string): ContractorRecord {
    return this.service.deactivate(id, reason, this.actor());
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private actor() {
    return {
      userId:       this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
