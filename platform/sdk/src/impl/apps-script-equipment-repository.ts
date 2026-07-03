// platform/sdk/src/impl/apps-script-equipment-repository.ts
// Apps Script Equipment repository — reads master data from Google Sheets.

import type {
  EquipmentId,
  EquipmentListQuery,
  EquipmentListResult,
  EquipmentRecord,
  IEquipmentRepository,
} from '@acc-reliability/services';

import type { IAppsScriptApiClient } from '../apps-script/apps-script-api-client';
import { AppsScriptNotImplementedError } from '../apps-script/apps-script-api-errors';
import { mapEquipmentDtoToRecord } from '../apps-script/apps-script-master-data-mappers';
import {
  executeAppsScriptRepositoryRequest,
  resolveListLimit,
  resolveListOffset,
} from '../apps-script/apps-script-repository-support';
import { APPS_SCRIPT_ENDPOINTS } from '../apps-script/contracts/apps-script-endpoints';
import type {
  EquipmentGetEndpointRequest,
  EquipmentGetEndpointResponse,
  EquipmentListEndpointRequest,
  EquipmentListEndpointResponse,
} from '../apps-script/contracts/equipment-endpoint-contracts';

export class AppsScriptEquipmentRepository implements IEquipmentRepository {
  constructor(private readonly client: IAppsScriptApiClient) {}

  save(_record: EquipmentRecord): EquipmentRecord {
    return this.notWritable('save');
  }

  update(_record: EquipmentRecord): EquipmentRecord {
    return this.notWritable('update');
  }

  findById(equipmentId: EquipmentId): EquipmentRecord | null {
    const request: EquipmentGetEndpointRequest = { equipmentId: String(equipmentId) };
    const response = executeAppsScriptRepositoryRequest<EquipmentGetEndpointResponse>(
      this.client,
      APPS_SCRIPT_ENDPOINTS.equipment.get,
      request,
    );

    return response.equipment ? mapEquipmentDtoToRecord(response.equipment) : null;
  }

  list(query?: EquipmentListQuery): EquipmentListResult {
    const request: EquipmentListEndpointRequest = {
      status: query?.status,
      contractorId: query?.contractorId ? String(query.contractorId) : undefined,
      area: query?.area,
      searchText: query?.searchText,
      offset: resolveListOffset(query?.offset),
      limit: resolveListLimit(query?.limit),
    };

    const response = executeAppsScriptRepositoryRequest<EquipmentListEndpointResponse>(
      this.client,
      APPS_SCRIPT_ENDPOINTS.equipment.list,
      request,
    );

    return {
      equipment: response.equipment.map(mapEquipmentDtoToRecord),
      total: response.total,
      offset: response.offset,
      limit: response.limit,
    };
  }

  count(): number {
    const response = executeAppsScriptRepositoryRequest<EquipmentListEndpointResponse>(
      this.client,
      APPS_SCRIPT_ENDPOINTS.equipment.list,
      { offset: 0, limit: 0 },
    );

    return response.total;
  }

  remove(_equipmentId: EquipmentId): boolean {
    return this.notWritable('remove');
  }

  private notWritable(method: string): never {
    throw new AppsScriptNotImplementedError(
      `Apps Script equipment repository method '${method}' is read-only in Sprint 05`,
      { endpoint: APPS_SCRIPT_ENDPOINTS.equipment.list },
    );
  }
}
