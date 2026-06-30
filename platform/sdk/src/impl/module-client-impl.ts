// platform/sdk/src/impl/module-client-impl.ts
// SDK bridge from IModuleClient → IModuleService.
//
// Derives the acting user (ActorRef) from the SdkContext so modules never
// supply their own actor — the platform always knows who is calling.

import type {
  IModuleService,
  ModuleRecord,
  ModuleRecordId,
  RegisterModuleRequest,
  UpdateModuleRequest,
  ModuleListQuery,
  ModuleListResult,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { IModuleClient } from '../clients/module-client';

/**
 * Concrete SDK module client.
 *
 * Every mutating call passes `{ userId, contractorId }` derived from
 * `SdkContext.currentUser` as the `ActorRef`.  The underlying
 * `ModuleService` records this actor in the audit trail and domain events.
 */
export class ModuleClientImpl implements IModuleClient {
  constructor(
    private readonly service: IModuleService,
    private readonly context: SdkContext,
  ) {}

  // ── Registration & CRUD ───────────────────────────────────────────────────

  register(request: RegisterModuleRequest): ModuleRecord {
    return this.service.register(request, this.actor());
  }

  findById(id: ModuleRecordId): ModuleRecord | null {
    return this.service.findById(id);
  }

  findByKey(moduleKey: string): ModuleRecord | null {
    return this.service.findByKey(moduleKey);
  }

  list(query?: ModuleListQuery): ModuleListResult {
    return this.service.list(query);
  }

  update(id: ModuleRecordId, request: UpdateModuleRequest): ModuleRecord {
    return this.service.update(id, request, this.actor());
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  enable(id: ModuleRecordId): ModuleRecord {
    return this.service.enable(id, this.actor());
  }

  disable(id: ModuleRecordId, reason: string): ModuleRecord {
    return this.service.disable(id, reason, this.actor());
  }

  startMaintenance(id: ModuleRecordId): ModuleRecord {
    return this.service.startMaintenance(id, this.actor());
  }

  endMaintenance(id: ModuleRecordId): ModuleRecord {
    return this.service.endMaintenance(id, this.actor());
  }

  retire(id: ModuleRecordId, reason: string): ModuleRecord {
    return this.service.retire(id, reason, this.actor());
  }

  restore(id: ModuleRecordId): ModuleRecord {
    return this.service.restore(id, this.actor());
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private actor() {
    return {
      userId:       this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
