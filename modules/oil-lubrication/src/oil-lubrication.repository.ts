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
} from '@acc-reliability/sdk';
import type { EquipmentId } from '@acc-reliability/services';
import type {
  OilChangeRecord,
  OilChangeRecordUpdateRequest,
  IOilLubricationRepository,
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
export class OilLubricationRepository implements IOilLubricationRepository {
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
    return this.inner.update(id, changes);
  }

  delete(id: string): Promise<void> {
    return this.inner.delete(id);
  }
}
