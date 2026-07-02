// platform/sdk/src/impl/equipment-client-impl.ts

import type {
  EquipmentId,
  IEquipmentService,
  EquipmentRecord,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentListQuery,
  EquipmentListResult,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { IEquipmentClient } from '../clients/equipment-client';

export class EquipmentClientImpl implements IEquipmentClient {
  constructor(
    private readonly service: IEquipmentService,
    private readonly context: SdkContext,
  ) {}

  create(request: CreateEquipmentRequest): EquipmentRecord {
    return this.service.create(request, this.actor());
  }

  findById(equipmentId: EquipmentId): EquipmentRecord | null {
    return this.service.findById(equipmentId);
  }

  list(query?: EquipmentListQuery): EquipmentListResult {
    return this.service.list(query);
  }

  update(equipmentId: EquipmentId, request: UpdateEquipmentRequest): EquipmentRecord {
    return this.service.update(equipmentId, request, this.actor());
  }

  private actor() {
    return {
      userId: this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
