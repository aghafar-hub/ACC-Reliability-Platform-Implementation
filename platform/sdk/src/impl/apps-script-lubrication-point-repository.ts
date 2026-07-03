// platform/sdk/src/impl/apps-script-lubrication-point-repository.ts
// Apps Script Lubrication Point repository — reads/writes master data via Google Sheets.

import {
  EntityNotFoundError,
} from '@acc-reliability/services';
import type {
  ILubricationPointRepository,
  LubricationPointListQuery,
  LubricationPointListResult,
  LubricationPointRecord,
  LubricationPointRecordId,
} from '@acc-reliability/services';

import type { IAppsScriptApiClient } from '../apps-script/apps-script-api-client';
import {
  APPS_SCRIPT_ERROR_CODES,
  AppsScriptApiError,
  AppsScriptRecordNotFoundError,
} from '../apps-script/apps-script-api-errors';
import {
  mapLubricationPointDtoToRecord,
  mapLubricationPointRecordToDto,
} from '../apps-script/apps-script-master-data-mappers';
import {
  executeAppsScriptRepositoryRequest,
  resolveListLimit,
  resolveListOffset,
} from '../apps-script/apps-script-repository-support';
import { APPS_SCRIPT_ENDPOINTS } from '../apps-script/contracts/apps-script-endpoints';
import type {
  LpDeactivateEndpointRequest,
  LpDeactivateEndpointResponse,
  LpGetEndpointRequest,
  LpGetEndpointResponse,
  LpListEndpointRequest,
  LpListEndpointResponse,
  LpUpsertEndpointRequest,
  LpUpsertEndpointResponse,
} from '../apps-script/contracts/lubrication-point-endpoint-contracts';

export class AppsScriptLubricationPointRepository implements ILubricationPointRepository {
  constructor(private readonly client: IAppsScriptApiClient) {}

  save(record: LubricationPointRecord): LubricationPointRecord {
    return this.upsertRecord(record);
  }

  update(record: LubricationPointRecord): LubricationPointRecord {
    return this.upsertRecord(record);
  }

  findById(id: LubricationPointRecordId): LubricationPointRecord | null {
    const request: LpGetEndpointRequest = { id: String(id) };
    return this.getRecord(request);
  }

  findByLpId(lpId: string): LubricationPointRecord | null {
    const request: LpGetEndpointRequest = { lpId };
    return this.getRecord(request);
  }

  list(query?: LubricationPointListQuery): LubricationPointListResult {
    const request: LpListEndpointRequest = {
      equipmentId: query?.equipmentId ? String(query.equipmentId) : undefined,
      contractorId: query?.contractorId ? String(query.contractorId) : undefined,
      area: query?.area,
      status: query?.status,
      searchText: query?.searchText,
      offset: resolveListOffset(query?.offset),
      limit: resolveListLimit(query?.limit),
    };

    const response = executeAppsScriptRepositoryRequest<LpListEndpointResponse>(
      this.client,
      APPS_SCRIPT_ENDPOINTS.lp.list,
      request,
    );

    return {
      lubricationPoints: response.lubricationPoints.map(mapLubricationPointDtoToRecord),
      total: response.total,
      offset: response.offset,
      limit: response.limit,
    };
  }

  count(): number {
    const response = executeAppsScriptRepositoryRequest<LpListEndpointResponse>(
      this.client,
      APPS_SCRIPT_ENDPOINTS.lp.list,
      { offset: 0, limit: 0 },
    );

    return response.total;
  }

  remove(id: LubricationPointRecordId): boolean {
    try {
      this.deactivateRecord(String(id));
      return true;
    } catch (error) {
      if (this.isMissingRecordError(error)) {
        return false;
      }
      throw error;
    }
  }

  private getRecord(request: LpGetEndpointRequest): LubricationPointRecord | null {
    const response = executeAppsScriptRepositoryRequest<LpGetEndpointResponse>(
      this.client,
      APPS_SCRIPT_ENDPOINTS.lp.get,
      request,
    );

    return response.lubricationPoint
      ? mapLubricationPointDtoToRecord(response.lubricationPoint)
      : null;
  }

  private upsertRecord(record: LubricationPointRecord): LubricationPointRecord {
    const request: LpUpsertEndpointRequest = {
      lubricationPoint: mapLubricationPointRecordToDto(record),
    };

    const response = executeAppsScriptRepositoryRequest<LpUpsertEndpointResponse>(
      this.client,
      APPS_SCRIPT_ENDPOINTS.lp.upsert,
      request,
    );

    return mapLubricationPointDtoToRecord(response.lubricationPoint);
  }

  private deactivateRecord(id: string): LubricationPointRecord {
    const request: LpDeactivateEndpointRequest = { id };

    try {
      const response = executeAppsScriptRepositoryRequest<LpDeactivateEndpointResponse>(
        this.client,
        APPS_SCRIPT_ENDPOINTS.lp.deactivate,
        request,
      );

      return mapLubricationPointDtoToRecord(response.lubricationPoint);
    } catch (error) {
      if (this.isMissingRecordError(error)) {
        throw new EntityNotFoundError(`LP record '${id}' not found`, { id });
      }
      throw error;
    }
  }

  private isMissingRecordError(error: unknown): boolean {
    return error instanceof AppsScriptRecordNotFoundError
      || (error instanceof AppsScriptApiError && error.code === APPS_SCRIPT_ERROR_CODES.RECORD_NOT_FOUND);
  }
}
