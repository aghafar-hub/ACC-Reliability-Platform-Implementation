// platform/sdk/src/clients/lubrication-point-client.ts

import type {
  LubricationPointRecord,
  LubricationPointRecordId,
  CreateLubricationPointRequest,
  UpdateLubricationPointRequest,
  LubricationPointListQuery,
  LubricationPointListResult,
} from '@acc-reliability/services';

export type {
  LubricationPointRecord,
  LubricationPointRecordId,
  LpStatus,
  CreateLubricationPointRequest,
  UpdateLubricationPointRequest,
  LubricationPointListQuery,
  LubricationPointListResult,
} from '@acc-reliability/services';

export interface ILubricationPointClient {
  create(request: CreateLubricationPointRequest): LubricationPointRecord;
  findById(id: LubricationPointRecordId): LubricationPointRecord | null;
  findByLpId(lpId: string): LubricationPointRecord | null;
  list(query?: LubricationPointListQuery): LubricationPointListResult;
  update(id: LubricationPointRecordId, request: UpdateLubricationPointRequest): LubricationPointRecord;
  deactivate(id: LubricationPointRecordId): LubricationPointRecord;
}
