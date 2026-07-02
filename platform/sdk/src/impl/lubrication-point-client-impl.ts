// platform/sdk/src/impl/lubrication-point-client-impl.ts

import type {
  ILubricationPointService,
  LubricationPointRecord,
  LubricationPointRecordId,
  CreateLubricationPointRequest,
  UpdateLubricationPointRequest,
  LubricationPointListQuery,
  LubricationPointListResult,
} from '@acc-reliability/services';

import type { SdkContext } from '../sdk-context';
import type { ILubricationPointClient } from '../clients/lubrication-point-client';

export class LubricationPointClientImpl implements ILubricationPointClient {
  constructor(
    private readonly service: ILubricationPointService,
    private readonly context: SdkContext,
  ) {}

  create(request: CreateLubricationPointRequest): LubricationPointRecord {
    return this.service.create(request, this.actor());
  }

  findById(id: LubricationPointRecordId): LubricationPointRecord | null {
    return this.service.findById(id);
  }

  findByLpId(lpId: string): LubricationPointRecord | null {
    return this.service.findByLpId(lpId);
  }

  list(query?: LubricationPointListQuery): LubricationPointListResult {
    return this.service.list(query);
  }

  update(id: LubricationPointRecordId, request: UpdateLubricationPointRequest): LubricationPointRecord {
    return this.service.update(id, request, this.actor());
  }

  deactivate(id: LubricationPointRecordId): LubricationPointRecord {
    return this.service.deactivate(id, this.actor());
  }

  private actor() {
    return {
      userId: this.context.currentUser.userId,
      contractorId: this.context.currentUser.contractorId,
    };
  }
}
