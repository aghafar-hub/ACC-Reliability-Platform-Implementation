// platform/services/src/equipment/equipment-types.ts
// Platform Equipment Master — authoritative equipment registry.
//
// Service id reserved: platform.equipment

import type { ContractorId, UserId } from '../auth/auth-types';
import type { EquipmentId } from '../contracts/communication-types';
import type { ActorRef } from '../user/user-types';

export type { ActorRef };

export const EQUIPMENT_STATUSES = ['active', 'inactive'] as const;
export type EquipmentStatus = typeof EQUIPMENT_STATUSES[number];

export interface EquipmentRecord {
  readonly equipmentId: EquipmentId;
  readonly name: string;
  readonly area: string;
  readonly contractorId: ContractorId;
  readonly status: EquipmentStatus;
  readonly createdAt: string;
  readonly createdBy: UserId;
  readonly updatedAt: string;
  readonly updatedBy: UserId;
}

export interface CreateEquipmentRequest {
  readonly equipmentId: EquipmentId;
  readonly name: string;
  readonly area: string;
  readonly contractorId: ContractorId;
  readonly status?: EquipmentStatus;
}

export interface UpdateEquipmentRequest {
  readonly name?: string;
  readonly area?: string;
  readonly contractorId?: ContractorId;
  readonly status?: EquipmentStatus;
}

export interface EquipmentListQuery {
  readonly status?: EquipmentStatus;
  readonly contractorId?: ContractorId;
  readonly area?: string;
  readonly searchText?: string;
  readonly offset?: number;
  readonly limit?: number;
}

export interface EquipmentListResult {
  readonly equipment: readonly EquipmentRecord[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface IEquipmentRepository {
  save(record: EquipmentRecord): EquipmentRecord;
  update(record: EquipmentRecord): EquipmentRecord;
  findById(equipmentId: EquipmentId): EquipmentRecord | null;
  list(query?: EquipmentListQuery): EquipmentListResult;
  count(): number;
  remove(equipmentId: EquipmentId): boolean;
}

export interface IEquipmentService {
  create(request: CreateEquipmentRequest, actor: ActorRef): EquipmentRecord;
  findById(equipmentId: EquipmentId): EquipmentRecord | null;
  list(query?: EquipmentListQuery): EquipmentListResult;
  update(equipmentId: EquipmentId, request: UpdateEquipmentRequest, actor: ActorRef): EquipmentRecord;
}
