// platform/sdk/src/apps-script/contracts/lubrication-point-endpoint-contracts.ts
// Request/response contracts for lp.* Apps Script endpoints.

import type { LpStatus } from '@acc-reliability/services';

/** Wire DTO for lubrication point records exchanged with Apps Script. */
export interface AppsScriptLubricationPointDto {
  readonly id: string;
  readonly lpId: string;
  readonly equipmentId: string;
  readonly lubricant: string;
  readonly frequencyDays: number;
  readonly oaRequired: boolean;
  readonly samplingIntervalDays: number | null;
  readonly status: LpStatus;
  readonly area: string;
  readonly contractorId: string;
  readonly name: string;
  readonly lastChangeDate: string | null;
  readonly nextDueDate: string | null;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/** `lp.list` request payload. */
export interface LpListEndpointRequest {
  readonly equipmentId?: string;
  readonly contractorId?: string;
  readonly area?: string;
  readonly status?: LpStatus;
  readonly searchText?: string;
  readonly offset?: number;
  readonly limit?: number;
}

/** `lp.list` response payload. */
export interface LpListEndpointResponse {
  readonly lubricationPoints: readonly AppsScriptLubricationPointDto[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

/** `lp.get` request payload. */
export interface LpGetEndpointRequest {
  readonly id?: string;
  readonly lpId?: string;
}

/** `lp.get` response payload. */
export interface LpGetEndpointResponse {
  readonly lubricationPoint: AppsScriptLubricationPointDto | null;
}

/** `lp.upsert` request payload. */
export interface LpUpsertEndpointRequest {
  readonly lubricationPoint: AppsScriptLubricationPointDto;
}

/** `lp.upsert` response payload. */
export interface LpUpsertEndpointResponse {
  readonly lubricationPoint: AppsScriptLubricationPointDto;
}

/** `lp.deactivate` request payload. */
export interface LpDeactivateEndpointRequest {
  readonly id: string;
}

/** `lp.deactivate` response payload. */
export interface LpDeactivateEndpointResponse {
  readonly lubricationPoint: AppsScriptLubricationPointDto;
}
