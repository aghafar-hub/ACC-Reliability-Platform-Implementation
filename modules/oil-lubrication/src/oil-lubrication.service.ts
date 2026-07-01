// modules/oil-lubrication/src/oil-lubrication.service.ts
// Business logic for oil change record management.
//
// This service is the only permitted location for oil lubrication business rules.
// It receives dependencies via constructor injection and returns ServiceResult<T>
// for all fallible operations — exceptions never cross the module boundary.
//
// Sprint 03 changes:
//   - cancelRecord() replaces deleteRecord() — no hard deletes on compliance records
//   - buildCreatePayload() handles new Sprint 03 fields:
//       filterChanged, breatherServiced, runningHours, technicianName, attachmentReference
//   - Error codes aligned to typed constants from OIL_LUBRICATION_ERROR_CODES

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
  IOilChangeRecordRepository,
  LubricationPointId,
  AttachmentReference,
} from './types';

// ── Typed error codes ─────────────────────────────────────────────────────────

/**
 * Typed error code constants for {@link OilLubricationService}.
 *
 * Used as the first argument to `err()` — never raw string literals.
 */
export const OIL_LUBRICATION_ERROR_CODES = {
  CREATE_FAILED:         'OIL_LUBRICATION_CREATE_FAILED',
  FETCH_FAILED:          'OIL_LUBRICATION_FETCH_FAILED',
  UPDATE_FAILED:         'OIL_LUBRICATION_UPDATE_FAILED',
  CANCEL_FAILED:         'OIL_LUBRICATION_CANCEL_FAILED',
  RECORD_NOT_FOUND:      'OIL_RECORD_NOT_FOUND',
  ALREADY_CANCELLED:     'OIL_RECORD_ALREADY_CANCELLED',
} as const;

// ── OilLubricationService ─────────────────────────────────────────────────────

/**
 * Core service for oil change record management.
 *
 * Instantiate via {@link createOilLubricationService} in `manifest.ts`.
 *
 * Hard deletion of oil change records is prohibited on this service.
 * Use {@link cancelRecord} to void a record — the `cancelled` status
 * preserves the full audit trail required for compliance reporting.
 */
export class OilLubricationService {
  constructor(
    private readonly repo: IOilChangeRecordRepository,
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
        OIL_LUBRICATION_ERROR_CODES.CREATE_FAILED,
        error instanceof Error ? error.message : 'Failed to create oil change record',
      );
    }
  }

  // ── Read — single record ───────────────────────────────────────────────────

  async getRecord(id: string): Promise<ServiceResult<OilChangeRecord>> {
    try {
      const record = await this.repo.findById(id);
      if (record === null) {
        return err(OIL_LUBRICATION_ERROR_CODES.RECORD_NOT_FOUND, `Oil change record not found: ${id}`);
      }
      return ok(record);
    } catch (error) {
      this.logger.error('OilLubricationService.getRecord failed', {
        id,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        OIL_LUBRICATION_ERROR_CODES.FETCH_FAILED,
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
        OIL_LUBRICATION_ERROR_CODES.FETCH_FAILED,
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
        OIL_LUBRICATION_ERROR_CODES.FETCH_FAILED,
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
        return err(OIL_LUBRICATION_ERROR_CODES.RECORD_NOT_FOUND, `Oil change record not found: ${id}`);
      }
      const updated = await this.repo.update(id, changes);
      return ok(updated);
    } catch (error) {
      this.logger.error('OilLubricationService.updateRecord failed', {
        id,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        OIL_LUBRICATION_ERROR_CODES.UPDATE_FAILED,
        error instanceof Error ? error.message : 'Failed to update oil change record',
      );
    }
  }

  // ── Cancel (replaces hard delete) ──────────────────────────────────────────

  /**
   * Voids an oil change record by setting its status to `cancelled`.
   *
   * This method replaces the former `deleteRecord()` hard delete. Cancelled
   * records are retained in storage to preserve the equipment audit trail
   * required for compliance and reliability reporting. Records in `cancelled`
   * status are excluded from scheduling calculations by {@link SchedulingService}.
   *
   * @param id  Unique identifier of the record to cancel.
   * @returns   The updated record with `status: 'cancelled'`, or an error result.
   */
  async cancelRecord(id: string): Promise<ServiceResult<OilChangeRecord>> {
    try {
      const existing = await this.repo.findById(id);
      if (existing === null) {
        return err(OIL_LUBRICATION_ERROR_CODES.RECORD_NOT_FOUND, `Oil change record not found: ${id}`);
      }
      if (existing.status === 'cancelled') {
        return err(
          OIL_LUBRICATION_ERROR_CODES.ALREADY_CANCELLED,
          `Oil change record is already cancelled: ${id}`,
        );
      }
      const updated = await this.repo.update(id, { status: 'cancelled' });
      this.logger.info('Oil change record cancelled', {
        id,
        equipmentId: existing.equipmentId,
        previousStatus: existing.status,
      });
      return ok(updated);
    } catch (error) {
      this.logger.error('OilLubricationService.cancelRecord failed', {
        id,
        error: error instanceof PlatformError ? error.toJSON() : String(error),
      });
      return err(
        OIL_LUBRICATION_ERROR_CODES.CANCEL_FAILED,
        error instanceof Error ? error.message : 'Failed to cancel oil change record',
      );
    }
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Builds the create payload from a request and a server timestamp.
 *
 * Optional fields are included only when present in the request to satisfy
 * exactOptionalPropertyTypes. Sprint 03 fields (filterChanged, breatherServiced,
 * runningHours, technicianName, attachmentReference) are handled the same way.
 */
function buildCreatePayload(
  request: OilChangeRecordCreateRequest,
  now: IsoTimestamp
): Omit<OilChangeRecord, 'id'> {
  const base: {
    readonly equipmentId: typeof request.equipmentId;
    readonly contractorId: typeof request.contractorId;
    readonly status: OilChangeRecord['status'];
    readonly source: OilChangeRecord['source'];
    readonly oilType: string;
    readonly quantityLitres: number;
    readonly performedAt: IsoTimestamp;
    readonly completedBy: typeof request.completedBy;
    readonly createdAt: IsoTimestamp;
    readonly updatedAt: IsoTimestamp;
    lubricationPointId?: LubricationPointId;
    workOrderId?: string;
    notes?: string;
    filterChanged?: boolean;
    breatherServiced?: boolean;
    runningHours?: number;
    technicianName?: string;
    attachmentReference?: AttachmentReference;
  } = {
    equipmentId:     request.equipmentId,
    contractorId:    request.contractorId,
    status:          request.status  ?? 'completed',
    source:          request.source  ?? 'manual',
    oilType:         request.oilType,
    quantityLitres:  request.quantityLitres,
    performedAt:     request.performedAt,
    completedBy:     request.completedBy,
    createdAt:       now,
    updatedAt:       now,
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
  if (request.filterChanged !== undefined) {
    base.filterChanged = request.filterChanged;
  }
  if (request.breatherServiced !== undefined) {
    base.breatherServiced = request.breatherServiced;
  }
  if (request.runningHours !== undefined) {
    base.runningHours = request.runningHours;
  }
  if (request.technicianName !== undefined) {
    base.technicianName = request.technicianName;
  }
  if (request.attachmentReference !== undefined) {
    base.attachmentReference = request.attachmentReference;
  }

  return base;
}
