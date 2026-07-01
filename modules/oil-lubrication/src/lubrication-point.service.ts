// modules/oil-lubrication/src/lubrication-point.service.ts
// Domain service for lubrication point lifecycle management.
//
// Sprint 02 — Lubrication Point Explorer (domain layer).
//
// Uses ILubricationPointRepository (defined in types.ts) and returns
// ServiceResult<T> for every operation so callers can handle errors uniformly.
//
// Note: The UI layer uses a separate synchronous localStorage adapter
// (apps/owner-center/src/modules/oil-lubrication/lubrication-point.service.ts)
// because sdk.storage is not yet wired. This file provides the domain contract.

import type { ILogger }            from '@acc-reliability/sdk';
import type { ServiceResult }       from '@acc-reliability/shared-types';
import { ok, err }                  from '@acc-reliability/shared-types';
import { nowIso }                   from '@acc-reliability/shared-types';
import type {
  LubricationPoint,
  LubricationPointCreateRequest,
  LubricationPointUpdateRequest,
  ILubricationPointRepository,
  LubricationPointId,
} from './types';
import type {
  EquipmentId,
  PagedQueryOptions,
  PageResult,
} from '@acc-reliability/sdk';

// ── Error codes ───────────────────────────────────────────────────────────────

const ERR_NOT_FOUND     = 'LP_NOT_FOUND'     as const;
const ERR_DUPLICATE     = 'LP_DUPLICATE'     as const;
const ERR_VALIDATION    = 'LP_VALIDATION'    as const;
const ERR_ALREADY_OFF   = 'LP_ALREADY_OFF'   as const;
const ERR_INTERNAL      = 'LP_INTERNAL'      as const;

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Domain service for Lubrication Point lifecycle management.
 *
 * All methods return {@link ServiceResult} — components should never receive
 * raw domain errors.
 */
export class LubricationPointService {
  constructor(
    private readonly repo:   ILubricationPointRepository,
    private readonly logger: ILogger,
  ) {}

  async getPoint(id: string): Promise<ServiceResult<LubricationPoint>> {
    try {
      const point = await this.repo.findById(id);
      if (!point) {
        return err(ERR_NOT_FOUND, `Lubrication point not found: ${id}`);
      }
      return ok(point);
    } catch (e) {
      this.logger.error('LubricationPointService.getPoint failed', { id, error: String(e) });
      return err(ERR_INTERNAL, String(e));
    }
  }

  async getByLpId(
    lpId: LubricationPointId,
  ): Promise<ServiceResult<LubricationPoint>> {
    try {
      const point = await this.repo.findByLubricationPointId(lpId);
      if (!point) {
        return err(ERR_NOT_FOUND, `Lubrication point not found: ${lpId}`);
      }
      return ok(point);
    } catch (e) {
      this.logger.error('LubricationPointService.getByLpId failed', { lpId, error: String(e) });
      return err(ERR_INTERNAL, String(e));
    }
  }

  async listByEquipment(
    equipmentId: EquipmentId,
  ): Promise<ServiceResult<readonly LubricationPoint[]>> {
    try {
      const points = await this.repo.findByEquipmentId(equipmentId);
      return ok(points);
    } catch (e) {
      this.logger.error('LubricationPointService.listByEquipment failed', { equipmentId, error: String(e) });
      return err(ERR_INTERNAL, String(e));
    }
  }

  async listPaged(
    options: PagedQueryOptions<LubricationPoint>,
  ): Promise<ServiceResult<PageResult<LubricationPoint>>> {
    try {
      const page = await this.repo.findPaged(options);
      return ok(page);
    } catch (e) {
      this.logger.error('LubricationPointService.listPaged failed', { error: String(e) });
      return err(ERR_INTERNAL, String(e));
    }
  }

  async createPoint(
    request: LubricationPointCreateRequest,
  ): Promise<ServiceResult<LubricationPoint>> {
    try {
      if (!request.name.trim()) {
        return err(ERR_VALIDATION, 'Lubrication point name is required.');
      }
      const existing = await this.repo.findByLubricationPointId(request.lubricationPointId);
      if (existing) {
        return err(
          ERR_DUPLICATE,
          `Lubrication point ID '${request.lubricationPointId}' already exists.`,
        );
      }
      const now = nowIso();
      const point = await this.repo.create(buildLpCreatePayload(request, now));
      this.logger.info('LubricationPointService.createPoint succeeded', { id: point.id });
      return ok(point);
    } catch (e) {
      this.logger.error('LubricationPointService.createPoint failed', { error: String(e) });
      return err(ERR_INTERNAL, String(e));
    }
  }

  async updatePoint(
    id: string,
    changes: LubricationPointUpdateRequest,
  ): Promise<ServiceResult<LubricationPoint>> {
    try {
      const existing = await this.repo.findById(id);
      if (!existing) {
        return err(ERR_NOT_FOUND, `Lubrication point not found: ${id}`);
      }
      const point = await this.repo.update(id, changes);
      return ok(point);
    } catch (e) {
      this.logger.error('LubricationPointService.updatePoint failed', { id, error: String(e) });
      return err(ERR_INTERNAL, String(e));
    }
  }

  async deactivatePoint(id: string): Promise<ServiceResult<LubricationPoint>> {
    try {
      const existing = await this.repo.findById(id);
      if (!existing) {
        return err(ERR_NOT_FOUND, `Lubrication point not found: ${id}`);
      }
      if (!existing.isActive) {
        return err(ERR_ALREADY_OFF, 'Lubrication point is already inactive.');
      }
      const point = await this.repo.deactivate(id);
      this.logger.info('LubricationPointService.deactivatePoint succeeded', { id });
      return ok(point);
    } catch (e) {
      this.logger.error('LubricationPointService.deactivatePoint failed', { id, error: String(e) });
      return err(ERR_INTERNAL, String(e));
    }
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Builds the repository create payload from a request and server timestamp.
 *
 * Optional fields (Sprint 02 + Sprint 03) are included conditionally to
 * satisfy exactOptionalPropertyTypes; absent request fields are omitted
 * from the payload rather than set to undefined.
 */
function buildLpCreatePayload(
  request: LubricationPointCreateRequest,
  now: ReturnType<typeof nowIso>,
): Omit<LubricationPoint, 'id'> {
  const base: {
    readonly lubricationPointId: LubricationPoint['lubricationPointId'];
    readonly equipmentId: LubricationPoint['equipmentId'];
    readonly contractorId: LubricationPoint['contractorId'];
    readonly name: string;
    readonly isActive: boolean;
    readonly createdAt: LubricationPoint['createdAt'];
    readonly updatedAt: LubricationPoint['updatedAt'];
    location?: string;
    lubricantSpec?: string;
    frequency?: LubricationPoint['frequency'];
    standardQuantityL?: number;
    areaName?: string;
    pointCode?: string;
    position?: string;
  } = {
    lubricationPointId: request.lubricationPointId,
    equipmentId:        request.equipmentId,
    contractorId:       request.contractorId,
    name:               request.name.trim(),
    isActive:           true,
    createdAt:          now,
    updatedAt:          now,
  };

  if (request.location          !== undefined) { base.location          = request.location;          }
  if (request.lubricantSpec     !== undefined) { base.lubricantSpec     = request.lubricantSpec;     }
  if (request.frequency         !== undefined) { base.frequency         = request.frequency;         }
  if (request.standardQuantityL !== undefined) { base.standardQuantityL = request.standardQuantityL; }
  if (request.areaName          !== undefined) { base.areaName          = request.areaName;          }
  if (request.pointCode         !== undefined) { base.pointCode         = request.pointCode;         }
  if (request.position          !== undefined) { base.position          = request.position;          }

  return base;
}
