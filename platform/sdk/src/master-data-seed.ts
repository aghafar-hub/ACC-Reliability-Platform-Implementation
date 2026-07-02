// platform/sdk/src/master-data-seed.ts
// Canonical platform master data seeds — Sprint 01 Master Data Unification.

import {
  createContractorId,
  createEquipmentId,
  createUserId,
} from '@acc-reliability/services';
import type {
  IEquipmentService,
  ILubricationPointService,
  CreateEquipmentRequest,
  CreateLubricationPointRequest,
  LubricationPointRecordId,
} from '@acc-reliability/services';

const SYSTEM_ACTOR = {
  userId: createUserId('platform.system'),
  contractorId: createContractorId('ACC'),
};

const EQUIPMENT_SEEDS: readonly CreateEquipmentRequest[] = [
  { equipmentId: createEquipmentId('EQ-PUMP-A01'), name: 'Centrifugal Pump A-01', area: 'Area-01', contractorId: createContractorId('ACC') },
  { equipmentId: createEquipmentId('EQ-PUMP-A02'), name: 'Centrifugal Pump A-02', area: 'Area-01', contractorId: createContractorId('ACC') },
  { equipmentId: createEquipmentId('EQ-COMP-B01'), name: 'Reciprocating Compressor B-01', area: 'Area-02', contractorId: createContractorId('RHI') },
  { equipmentId: createEquipmentId('EQ-CONV-C01'), name: 'Belt Conveyor C-01', area: 'Area-03', contractorId: createContractorId('ASEC') },
  { equipmentId: createEquipmentId('EQ-MOT-A01'), name: 'Induction Motor A-01', area: 'Area-01', contractorId: createContractorId('ACC') },
  { equipmentId: createEquipmentId('EQ-PUMP-D01'), name: 'Slurry Pump D-01', area: 'Area-04', contractorId: createContractorId('RHI') },
  { equipmentId: createEquipmentId('EQ-FAN-E01'), name: 'Induced Draft Fan E-01', area: 'Area-05', contractorId: createContractorId('ASEC') },
  { equipmentId: createEquipmentId('EQ-COMP-B02'), name: 'Reciprocating Compressor B-02', area: 'Area-02', contractorId: createContractorId('RHI') },
  { equipmentId: createEquipmentId('EQ-MOT-C01'), name: 'Induction Motor C-01', area: 'Area-03', contractorId: createContractorId('ASEC') },
  { equipmentId: createEquipmentId('EQ-PUMP-D02'), name: 'Slurry Pump D-02', area: 'Area-04', contractorId: createContractorId('ASEC') },
];

const LP_SEEDS: readonly CreateLubricationPointRequest[] = [
  {
    id: 'lp-seed-001' as LubricationPointRecordId,
    lpId: 'LP-001', equipmentId: createEquipmentId('EQ-PUMP-A01'),
    contractorId: createContractorId('ACC'), area: 'Area-01',
    name: 'Main Bearing', lubricant: 'ISO VG 46', frequencyDays: 30,
    oaRequired: true, samplingIntervalDays: 90,
    lastChangeDate: '2026-05-01', nextDueDate: '2026-05-31',
  },
  {
    id: 'lp-seed-002' as LubricationPointRecordId,
    lpId: 'LP-002', equipmentId: createEquipmentId('EQ-PUMP-A02'),
    contractorId: createContractorId('ACC'), area: 'Area-01',
    name: 'Impeller Seal', lubricant: 'ISO VG 46', frequencyDays: 30,
    oaRequired: true, samplingIntervalDays: 90,
    lastChangeDate: '2026-06-10', nextDueDate: '2026-07-10',
  },
  {
    id: 'lp-seed-003' as LubricationPointRecordId,
    lpId: 'LP-003', equipmentId: createEquipmentId('EQ-COMP-B01'),
    contractorId: createContractorId('RHI'), area: 'Area-02',
    name: 'Gearbox Input Shaft', lubricant: 'Shell Omala S2 G 220', frequencyDays: 90,
    oaRequired: true, samplingIntervalDays: 180,
    lastChangeDate: '2026-04-01', nextDueDate: '2026-07-01',
  },
  {
    id: 'lp-seed-004' as LubricationPointRecordId,
    lpId: 'LP-004', equipmentId: createEquipmentId('EQ-CONV-C01'),
    contractorId: createContractorId('ASEC'), area: 'Area-03',
    name: 'Drive Pulley Bearing', lubricant: 'Mobil DTE 25', frequencyDays: 60,
    oaRequired: false, samplingIntervalDays: null,
    lastChangeDate: '2026-05-15', nextDueDate: '2026-07-14',
  },
  {
    id: 'lp-seed-005' as LubricationPointRecordId,
    lpId: 'LP-005', equipmentId: createEquipmentId('EQ-MOT-A01'),
    contractorId: createContractorId('ACC'), area: 'Area-01',
    name: 'Motor Drive End Bearing', lubricant: 'ISO VG 32', frequencyDays: 45,
    oaRequired: true, samplingIntervalDays: 120,
    lastChangeDate: '2026-05-10', nextDueDate: '2026-06-24',
  },
  {
    id: 'lp-seed-006' as LubricationPointRecordId,
    lpId: 'LP-006', equipmentId: createEquipmentId('EQ-PUMP-D01'),
    contractorId: createContractorId('RHI'), area: 'Area-04',
    name: 'Suction Side Seal', lubricant: 'Castrol Hyspin AWS 32', frequencyDays: 60,
    oaRequired: true, samplingIntervalDays: 90,
    lastChangeDate: '2026-06-25', nextDueDate: '2026-07-05',
  },
  {
    id: 'lp-seed-007' as LubricationPointRecordId,
    lpId: 'LP-007', equipmentId: createEquipmentId('EQ-FAN-E01'),
    contractorId: createContractorId('ASEC'), area: 'Area-05',
    name: 'Fan Shaft Bearing', lubricant: 'ISO VG 68', frequencyDays: 90,
    oaRequired: false, samplingIntervalDays: null,
    lastChangeDate: '2026-06-01', nextDueDate: '2026-08-30',
  },
  {
    id: 'lp-seed-008' as LubricationPointRecordId,
    lpId: 'LP-008', equipmentId: createEquipmentId('EQ-COMP-B02'),
    contractorId: createContractorId('RHI'), area: 'Area-02',
    name: 'Gearbox Output Shaft', lubricant: 'Shell Omala S2 G 220', frequencyDays: 90,
    oaRequired: true, samplingIntervalDays: 180,
    lastChangeDate: '2026-06-01', nextDueDate: '2026-08-30',
  },
  {
    id: 'lp-seed-009' as LubricationPointRecordId,
    lpId: 'LP-009', equipmentId: createEquipmentId('EQ-MOT-C01'),
    contractorId: createContractorId('ASEC'), area: 'Area-03',
    name: 'Non-Drive End Bearing', lubricant: 'Mobil DTE 26', frequencyDays: 45,
    oaRequired: true, samplingIntervalDays: 120,
    lastChangeDate: '2026-06-28', nextDueDate: '2026-07-04',
  },
  {
    id: 'lp-seed-010' as LubricationPointRecordId,
    lpId: 'LP-010', equipmentId: createEquipmentId('EQ-PUMP-D02'),
    contractorId: createContractorId('ASEC'), area: 'Area-04',
    name: 'Discharge Seal', lubricant: 'Mobil DTE 25', frequencyDays: 60,
    oaRequired: false, samplingIntervalDays: null,
    status: 'inactive',
    lastChangeDate: '2026-05-07', nextDueDate: '2026-07-06',
  },
];

export function seedEquipmentMaster(service: IEquipmentService): void {
  for (const seed of EQUIPMENT_SEEDS) {
    try {
      if (service.findById(seed.equipmentId) !== null) continue;
      service.create(seed, SYSTEM_ACTOR);
    } catch {
      // Skip duplicates — safe for hot-reloads.
    }
  }
}

export function seedLubricationPointMaster(service: ILubricationPointService): void {
  for (const seed of LP_SEEDS) {
    try {
      if (service.findByLpId(seed.lpId) !== null) continue;
      service.create(seed, SYSTEM_ACTOR);
    } catch {
      // Skip duplicates — safe for hot-reloads.
    }
  }
}
