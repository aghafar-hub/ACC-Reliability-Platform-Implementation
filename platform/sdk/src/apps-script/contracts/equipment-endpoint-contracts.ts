// platform/sdk/src/apps-script/contracts/equipment-endpoint-contracts.ts
// Request/response contracts for equipment.* Apps Script endpoints.

import type { EquipmentStatus } from '@acc-reliability/services';

/** Wire DTO for equipment records exchanged with Apps Script. */
export interface AppsScriptEquipmentDto {
  readonly equipmentId: string;
  readonly name: string;
  readonly area: string;
  readonly contractorId: string;
  readonly status: EquipmentStatus;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/** `equipment.list` request payload. */
export interface EquipmentListEndpointRequest {
  readonly status?: EquipmentStatus;
  readonly contractorId?: string;
  readonly area?: string;
  readonly searchText?: string;
  readonly offset?: number;
  readonly limit?: number;
}

/** `equipment.list` response payload. */
export interface EquipmentListEndpointResponse {
  readonly equipment: readonly AppsScriptEquipmentDto[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

/** `equipment.get` request payload. */
export interface EquipmentGetEndpointRequest {
  readonly equipmentId: string;
}

/** `equipment.get` response payload. */
export interface EquipmentGetEndpointResponse {
  readonly equipment: AppsScriptEquipmentDto | null;
}
