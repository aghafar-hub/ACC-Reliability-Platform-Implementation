// modules/oil-lubrication/src/oil-lubrication.repository.ts
// Adapts the generic IRepository<OilChangeRecord> from the platform storage
// layer into the domain-focused IOilLubricationRepository interface.
//
// Contractor scope is embedded in the IRepository instance at creation time
// by IStorageClient.getRepository(); this adapter does not re-apply it.

import type {
  IRepository,
  FilterExpression,
  QueryOptions,
  PagedQueryOptions,
  PageResult,
  EquipmentId,
} from '@acc-reliability/sdk';
import type {
  OilChangeRecord,
  OilChangeRecordUpdateRequest,
  IOilChangeRecordRepository,
} from './types';

/**
 * Logical entity type name passed to {@link IStorageClient.getRepository}.
 * Must remain stable across storage provider migrations.
 */
export const OIL_CHANGE_RECORD_ENTITY_TYPE = 'oilChangeRecord' as const;

/**
 * Adapts {@link IRepository}<{@link OilChangeRecord}> into the domain
 * repository interface expected by {@link OilLubricationService}.
 */
export class OilLubricationRepository implements IOilChangeRecordRepository {
  constructor(private readonly inner: IRepository<OilChangeRecord>) {}

  findById(id: string): Promise<OilChangeRecord | null> {
    return this.inner.findById(id);
  }

  findByEquipmentId(
    equipmentId: EquipmentId,
    options?: QueryOptions<OilChangeRecord>
  ): Promise<readonly OilChangeRecord[]> {
    const equipmentFilter: FilterExpression<OilChangeRecord> = {
      kind: 'field',
      field: 'equipmentId',
      operator: 'eq',
      value: equipmentId,
    };
    const filter: FilterExpression<OilChangeRecord> =
      options?.filter !== undefined
        ? { kind: 'composite', logic: 'and', filters: [equipmentFilter, options.filter] }
        : equipmentFilter;
    return this.inner.findAll({ ...options, filter });
  }

  findPaged(options: PagedQueryOptions<OilChangeRecord>): Promise<PageResult<OilChangeRecord>> {
    return this.inner.findPaged(options);
  }

  create(data: Omit<OilChangeRecord, 'id'>): Promise<OilChangeRecord> {
    return this.inner.create(data);
  }

  update(id: string, changes: OilChangeRecordUpdateRequest): Promise<OilChangeRecord> {
    return this.inner.update(id, toDefinedPartial(changes));
  }

  delete(id: string): Promise<void> {
    return this.inner.delete(id);
  }
}

function toDefinedPartial(
  changes: OilChangeRecordUpdateRequest
): Partial<Omit<OilChangeRecord, 'id'>> {
  return {
    ...(changes.status !== undefined ? { status: changes.status } : {}),
    ...(changes.source !== undefined ? { source: changes.source } : {}),
    ...(changes.oilType !== undefined ? { oilType: changes.oilType } : {}),
    ...(changes.quantityLitres !== undefined ? { quantityLitres: changes.quantityLitres } : {}),
    ...(changes.performedAt !== undefined ? { performedAt: changes.performedAt } : {}),
    ...(changes.workOrderId !== undefined ? { workOrderId: changes.workOrderId } : {}),
    ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
  };
}
