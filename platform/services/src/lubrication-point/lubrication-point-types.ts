// platform/services/src/lubrication-point/lubrication-point-types.ts
// Platform Lubrication Point Master — authoritative LP registry.
//
// Service id reserved: platform.lubrication-points

import type { ContractorId, UserId } from '../auth/auth-types';
import type { EquipmentId } from '../contracts/communication-types';
import type { ActorRef } from '../user/user-types';

export type { ActorRef };

export const LP_STATUSES = ['active', 'inactive'] as const;
export type LpStatus = typeof LP_STATUSES[number];

declare const LubricationPointRecordIdBrand: unique symbol;
export type LubricationPointRecordId = string & { readonly [LubricationPointRecordIdBrand]: 'LubricationPointRecordId' };

export function generateLubricationPointRecordId(): LubricationPointRecordId {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 11);
  return `lp-${ts}-${rnd}` as LubricationPointRecordId;
}

export interface LubricationPointRecord {
  readonly id: LubricationPointRecordId;
  /** Business LP_ID code (e.g. "LP-001"). */
  readonly lpId: string;
  readonly equipmentId: EquipmentId;
  readonly lubricant: string;
  readonly frequencyDays: number;
  readonly oaRequired: boolean;
  readonly samplingIntervalDays: number | null;
  readonly status: LpStatus;
  readonly area: string;
  readonly contractorId: ContractorId;
  readonly name: string;
  readonly lastChangeDate: string | null;
  readonly nextDueDate: string | null;
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
}

export interface CreateLubricationPointRequest {
  readonly id?: LubricationPointRecordId;
  readonly lpId: string;
  readonly equipmentId: EquipmentId;
  readonly lubricant: string;
  readonly frequencyDays: number;
  readonly oaRequired?: boolean;
  readonly samplingIntervalDays?: number | null;
  readonly area: string;
  readonly contractorId: ContractorId;
  readonly name: string;
  readonly lastChangeDate?: string | null;
  readonly nextDueDate?: string | null;
  readonly status?: LpStatus;
}

export interface UpdateLubricationPointRequest {
  readonly lubricant?: string;
  readonly frequencyDays?: number;
  readonly oaRequired?: boolean;
  readonly samplingIntervalDays?: number | null;
  readonly area?: string;
  readonly contractorId?: ContractorId;
  readonly name?: string;
  readonly lastChangeDate?: string | null;
  readonly nextDueDate?: string | null;
  readonly status?: LpStatus;
}

export interface LubricationPointListQuery {
  readonly equipmentId?: EquipmentId;
  readonly contractorId?: ContractorId;
  readonly area?: string;
  readonly status?: LpStatus;
  readonly searchText?: string;
  readonly offset?: number;
  readonly limit?: number;
}

export interface LubricationPointListResult {
  readonly lubricationPoints: readonly LubricationPointRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface ILubricationPointRepository {
  save(record: LubricationPointRecord): LubricationPointRecord;
  update(record: LubricationPointRecord): LubricationPointRecord;
  findById(id: LubricationPointRecordId): LubricationPointRecord | null;
  findByLpId(lpId: string): LubricationPointRecord | null;
  list(query?: LubricationPointListQuery): LubricationPointListResult;
  count(): number;
  remove(id: LubricationPointRecordId): boolean;
}

export interface ILubricationPointService {
  create(request: CreateLubricationPointRequest, actor: ActorRef): LubricationPointRecord;
  findById(id: LubricationPointRecordId): LubricationPointRecord | null;
  findByLpId(lpId: string): LubricationPointRecord | null;
  list(query?: LubricationPointListQuery): LubricationPointListResult;
  update(id: LubricationPointRecordId, request: UpdateLubricationPointRequest, actor: ActorRef): LubricationPointRecord;
  deactivate(id: LubricationPointRecordId, actor: ActorRef): LubricationPointRecord;
}
