// modules/oil-lubrication/src/oil-lubrication.service.ts
// Business logic for oil change record management.
//
// This service is the only permitted location for oil lubrication business rules.
// It receives dependencies via constructor injection and returns ServiceResult<T>
// for all fallible operations — exceptions never cross the module boundary.
//
// Scaffold — minimal CRUD operations only.
// Workflows, approvals, and notifications are deferred to future patches.

import type { ServiceResult, IsoTimestamp } from '@acc-reliability/shared-types';
import { ok, err, nowIso } from '@acc-reliability/shared-types';
import type {
  ILogger,
  QueryOptions,
  PagedQueryOptions,
  PageResult,
  EquipmentId,
} from '@acc-reliability/sdk';
import { PlatformError } from '@acc-reliability/sdk';
import type {
  OilChangeRecord,
  OilChangeRecordCreateRequest,
  OilChangeRecordUpdateRequest,
  IOilLubricationRepository,
  LubricationPointId,
} from './types';

// ── OilLubricationService ─────────────────────────────────────────────────────

/**
 * Core service for oil change record management.
 *
 * Instantiate via {@link createOilLubricationService} in `manifest.ts`.
 */
export class OilLubricationService {
  constructor(
    private readonly repo: IOilLubricationRepository,
    private readonly logger: ILogger
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async createRecord(
    request: OilChangeRecordCreateRequest
  ): Promise<ServiceResult<OilChangeRecord>> {
    try {
      const now: IsoTimestamp = nowIso();
      const data = buildCreatePayload(request, now);
      const record = await this.repo.create(data);
      this.logger.info('Oil change record created', {
        id: record.id,
        equipmentId: record.equipmentId,
        contractorId: record.contractorId,
      });
      return ok(record);
    } catch (error) {
      this.logger.error('OilLubricationService.createRecord failed', {
        equipmentId: request.equipmentId,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        'OIL_LUBRICATION_CREATE_FAILED',
        error instanceof Error ? error.message : 'Failed to create oil change record',
      );
    }
  }

  // ── Read — single record ───────────────────────────────────────────────────

  async getRecord(id: string): Promise<ServiceResult<OilChangeRecord>> {
    try {
      const record = await this.repo.findById(id);
      if (record === null) {
        return err('OIL_RECORD_NOT_FOUND', `Oil change record not found: ${id}`);
      }
      return ok(record);
    } catch (error) {
      this.logger.error('OilLubricationService.getRecord failed', {
        id,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        'OIL_LUBRICATION_FETCH_FAILED',
        error instanceof Error ? error.message : 'Failed to fetch oil change record',
      );
    }
  }

  // ── Read — equipment history ───────────────────────────────────────────────

  async getEquipmentHistory(
    equipmentId: EquipmentId,
    options?: QueryOptions<OilChangeRecord>
  ): Promise<ServiceResult<readonly OilChangeRecord[]>> {
    try {
      const records = await this.repo.findByEquipmentId(equipmentId, options);
      return ok(records);
    } catch (error) {
      this.logger.error('OilLubricationService.getEquipmentHistory failed', {
        equipmentId,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        'OIL_LUBRICATION_FETCH_FAILED',
        error instanceof Error ? error.message : 'Failed to fetch equipment oil change history',
      );
    }
  }

  // ── Read — paged list ──────────────────────────────────────────────────────

  async listRecords(
    options: PagedQueryOptions<OilChangeRecord>
  ): Promise<ServiceResult<PageResult<OilChangeRecord>>> {
    try {
      const result = await this.repo.findPaged(options);
      return ok(result);
    } catch (error) {
      this.logger.error('OilLubricationService.listRecords failed', {
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        'OIL_LUBRICATION_FETCH_FAILED',
        error instanceof Error ? error.message : 'Failed to list oil change records',
      );
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async updateRecord(
    id: string,
    changes: OilChangeRecordUpdateRequest
  ): Promise<ServiceResult<OilChangeRecord>> {
    try {
      const existing = await this.repo.findById(id);
      if (existing === null) {
        return err('OIL_RECORD_NOT_FOUND', `Oil change record not found: ${id}`);
      }
      const updated = await this.repo.update(id, changes);
      return ok(updated);
    } catch (error) {
      this.logger.error('OilLubricationService.updateRecord failed', {
        id,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        'OIL_LUBRICATION_UPDATE_FAILED',
        error instanceof Error ? error.message : 'Failed to update oil change record',
      );
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async deleteRecord(id: string): Promise<ServiceResult<void>> {
    try {
      const existing = await this.repo.findById(id);
      if (existing === null) {
        return err('OIL_RECORD_NOT_FOUND', `Oil change record not found: ${id}`);
      }
      await this.repo.delete(id);
      return ok(undefined);
    } catch (error) {
      this.logger.error('OilLubricationService.deleteRecord failed', {
        id,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        'OIL_LUBRICATION_DELETE_FAILED',
        error instanceof Error ? error.message : 'Failed to delete oil change record',
      );
    }
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Builds the create payload from a request and a server timestamp.
 *
 * Optional fields are included only when present in the request to satisfy
 * exactOptionalPropertyTypes.
 */
function buildCreatePayload(
  request: OilChangeRecordCreateRequest,
  now: IsoTimestamp
): Omit<OilChangeRecord, 'id'> {
  const base: {
    readonly equipmentId: typeof request.equipmentId;
    readonly contractorId: typeof request.contractorId;
    readonly oilType: string;
    readonly quantityLitres: number;
    readonly performedAt: IsoTimestamp;
    readonly completedBy: typeof request.completedBy;
    readonly createdAt: IsoTimestamp;
    readonly updatedAt: IsoTimestamp;
    lubricationPointId?: LubricationPointId;
    workOrderId?: string;
    notes?: string;
  } = {
    equipmentId: request.equipmentId,
    contractorId: request.contractorId,
    oilType: request.oilType,
    quantityLitres: request.quantityLitres,
    performedAt: request.performedAt,
    completedBy: request.completedBy,
    createdAt: now,
    updatedAt: now,
  };

  if (request.lubricationPointId !== undefined) {
    base.lubricationPointId = request.lubricationPointId;
  }
  if (request.workOrderId !== undefined) {
    base.workOrderId = request.workOrderId;
  }
  if (request.notes !== undefined) {
    base.notes = request.notes;
  }

  return base;
}
