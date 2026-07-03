// platform/sdk/src/apps-script/apps-script-master-data-mappers.ts
// Maps Apps Script wire DTOs to platform master-data records.

import type {
  ContractorId,
  EquipmentId,
  EquipmentRecord,
  LubricationPointRecord,
  LubricationPointRecordId,
  UserId,
} from '@acc-reliability/services';

import type { AppsScriptEquipmentDto } from './contracts/equipment-endpoint-contracts';
import type { AppsScriptLubricationPointDto } from './contracts/lubrication-point-endpoint-contracts';

const DEFAULT_SYSTEM_USER = 'platform.system' as UserId;

function toUserId(value: string | undefined): UserId {
  const normalized = value?.trim();
  return (normalized && normalized.length > 0 ? normalized : DEFAULT_SYSTEM_USER) as UserId;
}

function toContractorId(value: string): ContractorId {
  return value as ContractorId;
}

function toEquipmentId(value: string): EquipmentId {
  return value as EquipmentId;
}

function toLubricationPointRecordId(value: string): LubricationPointRecordId {
  return value as LubricationPointRecordId;
}

export function mapEquipmentDtoToRecord(dto: AppsScriptEquipmentDto): EquipmentRecord {
  return Object.freeze({
    equipmentId: toEquipmentId(dto.equipmentId),
    name: dto.name,
    area: dto.area,
    contractorId: toContractorId(dto.contractorId),
    status: dto.status,
    createdAt: dto.createdAt,
    createdBy: toUserId(dto.createdBy),
    updatedAt: dto.updatedAt,
    updatedBy: toUserId(dto.updatedBy),
  });
}

export function mapLubricationPointDtoToRecord(
  dto: AppsScriptLubricationPointDto,
): LubricationPointRecord {
  const recordId = dto.id?.trim() || dto.lpId;

  return Object.freeze({
    id: toLubricationPointRecordId(recordId),
    lpId: dto.lpId,
    equipmentId: toEquipmentId(dto.equipmentId),
    lubricant: dto.lubricant,
    frequencyDays: dto.frequencyDays,
    oaRequired: dto.oaRequired,
    samplingIntervalDays: dto.samplingIntervalDays,
    status: dto.status,
    area: dto.area,
    contractorId: toContractorId(dto.contractorId),
    name: dto.name,
    lastChangeDate: dto.lastChangeDate,
    nextDueDate: dto.nextDueDate,
    createdAt: dto.createdAt,
    createdBy: toUserId(dto.createdBy),
    updatedAt: dto.updatedAt,
    updatedBy: toUserId(dto.updatedBy),
  });
}

export function mapLubricationPointRecordToDto(
  record: LubricationPointRecord,
): AppsScriptLubricationPointDto {
  return {
    id: String(record.id),
    lpId: record.lpId,
    equipmentId: String(record.equipmentId),
    lubricant: record.lubricant,
    frequencyDays: record.frequencyDays,
    oaRequired: record.oaRequired,
    samplingIntervalDays: record.samplingIntervalDays,
    status: record.status,
    area: record.area,
    contractorId: String(record.contractorId),
    name: record.name,
    lastChangeDate: record.lastChangeDate,
    nextDueDate: record.nextDueDate,
    createdAt: record.createdAt,
    createdBy: String(record.createdBy),
    updatedAt: record.updatedAt,
    updatedBy: String(record.updatedBy),
  };
}
