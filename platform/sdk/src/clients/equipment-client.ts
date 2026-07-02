// platform/sdk/src/clients/equipment-client.ts

import type { EquipmentId } from '@acc-reliability/services';
import type {
  EquipmentRecord,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentListQuery,
  EquipmentListResult,
} from '@acc-reliability/services';

export type {
  EquipmentRecord,
  EquipmentStatus,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentListQuery,
  EquipmentListResult,
} from '@acc-reliability/services';

export interface IEquipmentClient {
  create(request: CreateEquipmentRequest): EquipmentRecord;
  findById(equipmentId: EquipmentId): EquipmentRecord | null;
  list(query?: EquipmentListQuery): EquipmentListResult;
  update(equipmentId: EquipmentId, request: UpdateEquipmentRequest): EquipmentRecord;
}
