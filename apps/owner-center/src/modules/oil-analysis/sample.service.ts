// apps/owner-center/src/modules/oil-analysis/sample.service.ts
// Local-storage-backed service for Oil Analysis samples.
//
// Sprint 01 — module scaffold.
// Sprint 02 — sample registry, intake, validation, KPIs.
// Sprint 03 — lab results manual entry.
// Sprint 04 — PDF import shell + import review flow (metadata only).
// Sprint 05 — condition assessment rules for manual lab results.
// Sprint 06 — engineer review & approval workflow.
// Sprint 09 — sample code prefix from module settings.
//
// React components MUST NOT access localStorage directly; they call the service.

import { oilAnalysisSettingsService } from './settings.service';
import { isKnownEquipmentId } from './equipment-master.service';
import { lubricationPointService } from '../oil-lubrication/lubrication-point.service';
import {
  evaluateThresholdCondition,
  conditionLevelToResultStatus,
  conditionLevelToSampleStatus,
} from './threshold-engine';
import {
  isApprovalWorkflowEnabled,
  resolvePostLabApprovalState,
} from './approval-workflow';
import { applySampleAudit } from './sample-audit';
import {
  assertApprovalStatusTransition,
  assertCanConfirmLp,
  assertCanEnterLabResults,
  assertCanOpenReview,
  assertCanReviewAction,
  assertSampleStatusTransition,
  resolveInitialSampleStatus,
} from './status-engine';

// ── View model ────────────────────────────────────────────────────────────────

/** Lab result classification after manual entry. */
export type OilLabResultStatus = 'normal' | 'monitor' | 'caution' | 'critical';

/** PDF import lifecycle status (metadata shell — no parsing). */
export type PdfImportStatus =
  | 'none'
  | 'uploaded'
  | 'pending-review'
  | 'reviewed'
  | 'rejected';

/** Engineer review and approval lifecycle for analysed samples. */
export type OilSampleApprovalStatus =
  | 'pending'
  | 'under-review'
  | 'approved'
  | 'locked';

/** Audit action recorded in approval history. */
export type OilSampleApprovalAction =
  | 'opened'
  | 'edited'
  | 'approved'
  | 'rejected'
  | 'returned-for-correction'
  | 'locked'
  | 'lab-results-entered'
  | 'auto-approved';

/** Single entry in the engineer approval audit trail. */
export interface OilSampleApprovalHistoryEntry {
  readonly action: OilSampleApprovalAction;
  readonly actor: string;
  readonly at: string;
  readonly fromStatus: OilSampleApprovalStatus;
  readonly toStatus: OilSampleApprovalStatus;
  readonly notes?: string;
}

/** Engineer LP mapping confirmation audit entry. */
export interface OilSampleLpMappingHistoryEntry {
  readonly action: 'confirmed';
  readonly actor: string;
  readonly at: string;
  readonly lubricationPointId: string;
  readonly fromStatus: OilSampleRowStatus;
  readonly toStatus: OilSampleRowStatus;
  readonly notes?: string;
}

/** Row used by Oil Analysis UI; flat projection of a sample record. */
export interface OilSampleRow {
  readonly id: string;
  /** System sample code (e.g. "OA-2026-0001"). */
  readonly sampleId: string;
  readonly equipmentId: string;
  readonly lubricationPointId: string | null;
  /** Lab Sample ID / Oil Report ID — unique business key. */
  readonly labSampleId: string;
  /** ISO date (YYYY-MM-DD) of physical sampling. */
  readonly sampledAt: string;
  readonly lubricant: string;
  readonly contractorId: string;
  readonly area: string;
  readonly samplingLocation: string;
  readonly importSource: 'manual' | 'pdf-import' | 'lab-api';
  readonly status: OilSampleRowStatus;
  readonly resultStatus: OilLabResultStatus | null;
  readonly notes: string;
  readonly contaminationRating: string;
  readonly equipmentRating: string;
  readonly lubricantRating: string;
  readonly ironPpm: number | null;
  readonly copperPpm: number | null;
  readonly siliconPpm: number | null;
  readonly pqIndex: number | null;
  readonly viscosity100c: number | null;
  readonly tan: number | null;
  readonly oxidation: number | null;
  readonly waterPercent: number | null;
  readonly particle4: number | null;
  readonly particle6: number | null;
  readonly particle14: number | null;
  readonly sampleAnalysis: string;
  readonly alertType: string;
  readonly labResultEnteredAt: string | null;
  readonly pdfFileName: string | null;
  readonly pdfFileUrl: string | null;
  readonly pdfUploadedAt: string | null;
  readonly pdfImportStatus: PdfImportStatus;
  readonly pdfReviewNotes: string;
  readonly approvalStatus: OilSampleApprovalStatus | null;
  readonly labValuesLocked: boolean;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly approvalHistory: readonly OilSampleApprovalHistoryEntry[];
  readonly lpMappingHistory: readonly OilSampleLpMappingHistoryEntry[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type OilSampleRowStatus =
  | 'imported'
  | 'pending-review'
  | 'needs-lp-mapping'
  | 'linked'
  | 'analysed'
  | 'normal'
  | 'caution'
  | 'alert'
  | 'cancelled';

export type SampleCondition = 'pending' | OilConditionLevel;

/** Calculated overall condition from lab result fields. */
export type OilConditionLevel = 'normal' | 'monitor' | 'caution' | 'critical';

/** Input for condition assessment (persisted row or lab form preview). */
export interface OilConditionAssessmentInput {
  readonly resultStatus: OilLabResultStatus | null;
  readonly contaminationRating: string;
  readonly equipmentRating: string;
  readonly lubricantRating: string;
}

/** Dashboard KPI snapshot computed from persisted samples. */
export interface OilAnalysisDashboardKpis {
  readonly totalSamples: number;
  readonly pendingReview: number;
  readonly pdfPendingReview: number;
  readonly needsLpMapping: number;
  readonly critical: number;
  readonly completedThisMonth: number;
  readonly openRecommendations: number;
  readonly pendingApproval: number;
  readonly approvedToday: number;
}

/** Registry KPI strip snapshot. */
export interface OilSampleRegistryKpis {
  readonly total: number;
  readonly pendingReview: number;
  readonly needsLpMapping: number;
  readonly critical: number;
}

export interface OilSampleCreateInput {
  readonly equipmentId: string;
  readonly labSampleId: string;
  readonly sampledAt: string;
  readonly lubricant?: string;
  readonly contractorId?: string;
  readonly area?: string;
  readonly samplingLocation?: string;
  readonly notes?: string;
}

export interface OilPdfImportInput {
  readonly pdfFileName?: string | null;
  readonly pdfFileUrl: string;
}

export interface OilLabResultInput {
  /** Omitted on manual entry — computed automatically from module thresholds. */
  readonly resultStatus?: OilLabResultStatus;
  readonly contaminationRating: string;
  readonly equipmentRating: string;
  readonly lubricantRating: string;
  readonly ironPpm: number | null;
  readonly copperPpm: number | null;
  readonly siliconPpm: number | null;
  readonly pqIndex: number | null;
  readonly viscosity100c: number | null;
  readonly tan: number | null;
  readonly oxidation: number | null;
  readonly waterPercent: number | null;
  readonly particle4: number | null;
  readonly particle6: number | null;
  readonly particle14: number | null;
  readonly sampleAnalysis: string;
  readonly alertType: string;
}

/** Editable sample metadata during engineer review (before approval). */
export interface OilSampleReviewEditInput {
  readonly notes?: string;
  readonly lubricant?: string;
  readonly samplingLocation?: string;
  readonly labResults?: OilLabResultInput;
}

export interface OilSampleFilterParams {
  readonly search?: string;
  readonly status?: string;
  readonly area?: string;
  readonly contractor?: string;
  readonly condition?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'acc.oil-analysis.samples.v1';

const NUMERIC_LAB_FIELDS = [
  'ironPpm',
  'copperPpm',
  'siliconPpm',
  'pqIndex',
  'viscosity100c',
  'tan',
  'oxidation',
  'waterPercent',
  'particle4',
  'particle6',
  'particle14',
] as const satisfies readonly (keyof OilLabResultInput)[];

function isoNow(): string {
  return new Date().toISOString();
}

function currentYearMonth(): string {
  return isoNow().slice(0, 7);
}

function generateInternalId(): string {
  return `oa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeLabSampleId(value: string): string {
  return value.trim().toLowerCase();
}

function todayDateString(): string {
  return isoNow().slice(0, 10);
}

function isFutureDate(isoDate: string): boolean {
  return isoDate > todayDateString();
}

function normalizeNumeric(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

function normalizeResultStatus(raw: unknown): OilLabResultStatus | null {
  if (raw === 'alert') return 'critical';
  if (raw === 'normal' || raw === 'monitor' || raw === 'caution' || raw === 'critical') {
    return raw;
  }
  return null;
}

function normalizeApprovalStatus(raw: unknown): OilSampleApprovalStatus | null {
  if (
    raw === 'pending' ||
    raw === 'under-review' ||
    raw === 'approved' ||
    raw === 'locked'
  ) {
    return raw;
  }
  return null;
}

function normalizeApprovalHistory(raw: unknown): readonly OilSampleApprovalHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is OilSampleApprovalHistoryEntry => {
      if (!entry || typeof entry !== 'object') return false;
      const e = entry as Partial<OilSampleApprovalHistoryEntry>;
      return (
        typeof e.action === 'string' &&
        typeof e.actor === 'string' &&
        typeof e.at === 'string' &&
        typeof e.fromStatus === 'string' &&
        typeof e.toStatus === 'string'
      );
    })
    .map((entry) => ({
      action: entry.action,
      actor: entry.actor,
      at: entry.at,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      ...(entry.notes ? { notes: entry.notes } : {}),
    }));
}

function normalizeLpMappingHistory(raw: unknown): readonly OilSampleLpMappingHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is OilSampleLpMappingHistoryEntry => {
      if (!entry || typeof entry !== 'object') return false;
      const e = entry as Partial<OilSampleLpMappingHistoryEntry>;
      return (
        e.action === 'confirmed' &&
        typeof e.actor === 'string' &&
        typeof e.at === 'string' &&
        typeof e.lubricationPointId === 'string' &&
        typeof e.fromStatus === 'string' &&
        typeof e.toStatus === 'string'
      );
    })
    .map((entry) => ({
      action: entry.action,
      actor: entry.actor,
      at: entry.at,
      lubricationPointId: entry.lubricationPointId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      ...(entry.notes ? { notes: entry.notes } : {}),
    }));
}

function isLabValuesLocked(row: OilSampleRow): boolean {
  return (
    row.labValuesLocked ||
    row.approvalStatus === 'approved' ||
    row.approvalStatus === 'locked'
  );
}

function emptyPdfFields(): Pick<
  OilSampleRow,
  'pdfFileName' | 'pdfFileUrl' | 'pdfUploadedAt' | 'pdfImportStatus' | 'pdfReviewNotes'
> {
  return {
    pdfFileName: null,
    pdfFileUrl: null,
    pdfUploadedAt: null,
    pdfImportStatus: 'none',
    pdfReviewNotes: '',
  };
}

function normalizePdfImportStatus(raw: unknown): PdfImportStatus {
  if (
    raw === 'uploaded' ||
    raw === 'pending-review' ||
    raw === 'reviewed' ||
    raw === 'rejected'
  ) {
    return raw;
  }
  return 'none';
}

function isValidPdfUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function emptyLabFields(): Pick<
  OilSampleRow,
  | 'contaminationRating'
  | 'equipmentRating'
  | 'lubricantRating'
  | 'ironPpm'
  | 'copperPpm'
  | 'siliconPpm'
  | 'pqIndex'
  | 'viscosity100c'
  | 'tan'
  | 'oxidation'
  | 'waterPercent'
  | 'particle4'
  | 'particle6'
  | 'particle14'
  | 'sampleAnalysis'
  | 'alertType'
  | 'labResultEnteredAt'
> {
  return {
    contaminationRating: '',
    equipmentRating: '',
    lubricantRating: '',
    ironPpm: null,
    copperPpm: null,
    siliconPpm: null,
    pqIndex: null,
    viscosity100c: null,
    tan: null,
    oxidation: null,
    waterPercent: null,
    particle4: null,
    particle6: null,
    particle14: null,
    sampleAnalysis: '',
    alertType: '',
    labResultEnteredAt: null,
  };
}

const CONDITION_SEVERITY: Record<OilConditionLevel, number> = {
  normal: 0,
  monitor: 1,
  caution: 2,
  critical: 3,
};

/** Parse a free-text rating field into a condition level. */
export function parseRatingLevel(raw: string): OilConditionLevel | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === 'critical' || value === 'alert') return 'critical';
  if (value === 'caution' || value === 'warning') return 'caution';
  if (value === 'monitor') return 'monitor';
  if (value === 'normal') return 'normal';
  return null;
}

function worstConditionLevel(
  levels: readonly OilConditionLevel[],
): OilConditionLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((worst, current) =>
    CONDITION_SEVERITY[current] > CONDITION_SEVERITY[worst] ? current : worst,
  );
}

/**
 * Compute overall condition from automatic threshold evaluation and optional ratings.
 * Highest severity wins.
 */
export function computeConditionAssessment(
  input: OilConditionAssessmentInput & {
    readonly ironPpm?: number | null;
    readonly copperPpm?: number | null;
    readonly siliconPpm?: number | null;
    readonly pqIndex?: number | null;
    readonly viscosity100c?: number | null;
    readonly tan?: number | null;
    readonly oxidation?: number | null;
    readonly waterPercent?: number | null;
    readonly particle4?: number | null;
    readonly particle6?: number | null;
    readonly particle14?: number | null;
  },
): OilConditionLevel | null {
  const levels: OilConditionLevel[] = [];

  const thresholdLevel = evaluateThresholdCondition({
    ironPpm: input.ironPpm ?? null,
    copperPpm: input.copperPpm ?? null,
    siliconPpm: input.siliconPpm ?? null,
    pqIndex: input.pqIndex ?? null,
    viscosity100c: input.viscosity100c ?? null,
    tan: input.tan ?? null,
    oxidation: input.oxidation ?? null,
    waterPercent: input.waterPercent ?? null,
    particle4: input.particle4 ?? null,
    particle6: input.particle6 ?? null,
    particle14: input.particle14 ?? null,
  });
  if (thresholdLevel) levels.push(thresholdLevel);
  else if (input.resultStatus) levels.push(input.resultStatus);

  for (const field of [
    input.contaminationRating,
    input.equipmentRating,
    input.lubricantRating,
  ]) {
    const parsed = parseRatingLevel(field);
    if (parsed) levels.push(parsed);
  }

  return worstConditionLevel(levels);
}

function resolveLabResultStatus(
  input: OilLabResultInput,
): { resultStatus: OilLabResultStatus; conditionStatus: 'normal' | 'caution' | 'alert' } {
  const assessed = computeConditionAssessment({
    resultStatus: input.resultStatus ?? null,
    contaminationRating: input.contaminationRating,
    equipmentRating: input.equipmentRating,
    lubricantRating: input.lubricantRating,
    ironPpm: input.ironPpm,
    copperPpm: input.copperPpm,
    siliconPpm: input.siliconPpm,
    pqIndex: input.pqIndex,
    viscosity100c: input.viscosity100c,
    tan: input.tan,
    oxidation: input.oxidation,
    waterPercent: input.waterPercent,
    particle4: input.particle4,
    particle6: input.particle6,
    particle14: input.particle14,
  });

  if (!assessed) {
    throw new Error('Enter at least one enabled lab parameter value to evaluate condition.');
  }

  return {
    resultStatus: conditionLevelToResultStatus(assessed),
    conditionStatus: conditionLevelToSampleStatus(assessed),
  };
}

/** Derive display condition from lab result fields and sample status. */
export function computeSampleCondition(row: OilSampleRow): SampleCondition {
  const assessed = computeConditionAssessment({
    resultStatus: row.resultStatus,
    contaminationRating: row.contaminationRating,
    equipmentRating: row.equipmentRating,
    lubricantRating: row.lubricantRating,
    ironPpm: row.ironPpm,
    copperPpm: row.copperPpm,
    siliconPpm: row.siliconPpm,
    pqIndex: row.pqIndex,
    viscosity100c: row.viscosity100c,
    tan: row.tan,
    oxidation: row.oxidation,
    waterPercent: row.waterPercent,
    particle4: row.particle4,
    particle6: row.particle6,
    particle14: row.particle14,
  });

  if (assessed) return assessed;

  if (row.status === 'alert') return 'critical';
  if (row.status === 'caution') return 'caution';
  if (row.status === 'normal' || row.status === 'analysed') return 'normal';
  return 'pending';
}

export function hasLabResults(row: OilSampleRow): boolean {
  return row.resultStatus !== null && row.labResultEnteredAt !== null;
}

export function isSampleApprovalLocked(row: OilSampleRow): boolean {
  return isLabValuesLocked(row);
}

function normalizeRow(
  raw: Partial<OilSampleRow> & { labReferenceId?: string | null },
): OilSampleRow {
  const labSampleId =
    (typeof raw.labSampleId === 'string' && raw.labSampleId.trim()) ||
    (typeof raw.labReferenceId === 'string' && raw.labReferenceId.trim()) ||
    '';

  const labDefaults = emptyLabFields();
  const pdfDefaults = emptyPdfFields();

  return {
    id: raw.id ?? generateInternalId(),
    sampleId: raw.sampleId ?? 'OA-UNKNOWN',
    equipmentId: raw.equipmentId ?? '',
    lubricationPointId: raw.lubricationPointId ?? null,
    labSampleId,
    sampledAt: raw.sampledAt ?? '',
    lubricant: raw.lubricant ?? '',
    contractorId: raw.contractorId ?? '',
    area: raw.area ?? '',
    samplingLocation: raw.samplingLocation ?? '',
    importSource: raw.importSource ?? 'manual',
    status: raw.status ?? 'imported',
    resultStatus: normalizeResultStatus(raw.resultStatus),
    notes: raw.notes ?? '',
    contaminationRating: raw.contaminationRating ?? labDefaults.contaminationRating,
    equipmentRating: raw.equipmentRating ?? labDefaults.equipmentRating,
    lubricantRating: raw.lubricantRating ?? labDefaults.lubricantRating,
    ironPpm: normalizeNumeric(raw.ironPpm),
    copperPpm: normalizeNumeric(raw.copperPpm),
    siliconPpm: normalizeNumeric(raw.siliconPpm),
    pqIndex: normalizeNumeric(raw.pqIndex),
    viscosity100c: normalizeNumeric(raw.viscosity100c),
    tan: normalizeNumeric(raw.tan),
    oxidation: normalizeNumeric(raw.oxidation),
    waterPercent: normalizeNumeric(raw.waterPercent),
    particle4: normalizeNumeric(raw.particle4),
    particle6: normalizeNumeric(raw.particle6),
    particle14: normalizeNumeric(raw.particle14),
    sampleAnalysis: raw.sampleAnalysis ?? labDefaults.sampleAnalysis,
    alertType: raw.alertType ?? labDefaults.alertType,
    labResultEnteredAt: raw.labResultEnteredAt ?? labDefaults.labResultEnteredAt,
    pdfFileName: raw.pdfFileName ?? pdfDefaults.pdfFileName,
    pdfFileUrl: raw.pdfFileUrl ?? pdfDefaults.pdfFileUrl,
    pdfUploadedAt: raw.pdfUploadedAt ?? pdfDefaults.pdfUploadedAt,
    pdfImportStatus: normalizePdfImportStatus(raw.pdfImportStatus),
    pdfReviewNotes: raw.pdfReviewNotes ?? pdfDefaults.pdfReviewNotes,
    approvalStatus:
      normalizeApprovalStatus(raw.approvalStatus) ??
      (((raw.resultStatus !== null && raw.resultStatus !== undefined) &&
        (raw.status ?? 'imported') === 'analysed')
        ? 'pending'
        : null),
    labValuesLocked: raw.labValuesLocked === true,
    approvedBy: raw.approvedBy ?? null,
    approvedAt: raw.approvedAt ?? null,
    approvalHistory: normalizeApprovalHistory(raw.approvalHistory),
    lpMappingHistory: normalizeLpMappingHistory(raw.lpMappingHistory),
    createdAt: raw.createdAt ?? isoNow(),
    updatedAt: raw.updatedAt ?? isoNow(),
  };
}

function isActiveSample(row: OilSampleRow): boolean {
  return row.status !== 'cancelled';
}

function isCriticalSample(row: OilSampleRow): boolean {
  return computeSampleCondition(row) === 'critical';
}

function isRecommendationOpen(row: OilSampleRow): boolean {
  const cond = computeSampleCondition(row);
  return cond === 'caution' || cond === 'monitor';
}

function validateNumericFields(input: OilLabResultInput): void {
  for (const key of NUMERIC_LAB_FIELDS) {
    const value = input[key];
    if (value !== null && value < 0) {
      throw new Error(`${key} cannot be negative.`);
    }
  }
}

// ── Repository ────────────────────────────────────────────────────────────────

class OilSampleLocalRepository {
  private readonly records: Map<string, OilSampleRow>;

  constructor() {
    const loaded = this.readFromStorage();
    this.records = new Map(loaded.map((r) => [r.id, r]));
  }

  private readFromStorage(): OilSampleRow[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => normalizeRow(item as Partial<OilSampleRow>));
    } catch {
      return [];
    }
  }

  private writeToStorage(): void {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(this.records.values())),
    );
  }

  list(): readonly OilSampleRow[] {
    return Array.from(this.records.values());
  }

  findById(id: string): OilSampleRow | null {
    return this.records.get(id) ?? null;
  }

  findByLabSampleId(labSampleId: string, excludeId?: string): OilSampleRow | null {
    const key = normalizeLabSampleId(labSampleId);
    if (!key) return null;
    for (const row of this.records.values()) {
      if (excludeId && row.id === excludeId) continue;
      if (normalizeLabSampleId(row.labSampleId) === key) return row;
    }
    return null;
  }

  create(row: OilSampleRow): OilSampleRow {
    this.records.set(row.id, row);
    this.writeToStorage();
    return row;
  }

  update(id: string, changes: Partial<OilSampleRow>): OilSampleRow {
    const existing = this.records.get(id);
    if (!existing) throw new Error(`Sample not found: ${id}`);
    const updated: OilSampleRow = { ...existing, ...changes, updatedAt: isoNow() };
    this.records.set(id, updated);
    this.writeToStorage();
    return updated;
  }

  nextSampleCode(): string {
    const year = new Date().getFullYear();
    const codePrefix = oilAnalysisSettingsService.getSampleNumberPrefix();
    const prefix = `${codePrefix}-${year}-`;
    const maxSeq = this.list().reduce((max, row) => {
      if (!row.sampleId.startsWith(prefix)) return max;
      const seq = Number.parseInt(row.sampleId.slice(prefix.length), 10);
      return Number.isFinite(seq) ? Math.max(max, seq) : max;
    }, 0);
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export class OilSampleLocalService {
  constructor(private readonly repo: OilSampleLocalRepository) {}

  list(): readonly OilSampleRow[] {
    return this.repo.list().filter(isActiveSample);
  }

  listForLabEntry(): readonly OilSampleRow[] {
    return [...this.list()].sort((a, b) => {
      const aPending = a.resultStatus === null ? 0 : 1;
      const bPending = b.resultStatus === null ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return b.sampledAt.localeCompare(a.sampledAt);
    });
  }

  findById(id: string): OilSampleRow | null {
    const row = this.repo.findById(id);
    return row && isActiveSample(row) ? row : null;
  }

  isLabSampleIdDuplicate(labSampleId: string, excludeId?: string): boolean {
    return this.repo.findByLabSampleId(labSampleId, excludeId) !== null;
  }

  create(input: OilSampleCreateInput): OilSampleRow {
    const equipmentId = input.equipmentId.trim();
    if (!equipmentId) throw new Error('Equipment ID is required.');
    if (!isKnownEquipmentId(equipmentId)) {
      throw new Error(`Equipment ID '${equipmentId}' is not registered in Equipment Master.`);
    }

    const labSampleId = input.labSampleId.trim();
    if (!labSampleId) throw new Error('Lab Sample ID is required.');

    const sampledAt = input.sampledAt.trim();
    if (!sampledAt) throw new Error('Sample date is required.');
    if (isFutureDate(sampledAt)) throw new Error('Sample date cannot be in the future.');

    if (this.isLabSampleIdDuplicate(labSampleId)) {
      throw new Error(`Lab Sample ID '${labSampleId}' already exists.`);
    }

    const now = isoNow();
    const initialStatus = resolveInitialSampleStatus(
      oilAnalysisSettingsService.getSettings().general.defaultSampleStatus,
    );
    const row: OilSampleRow = {
      id: generateInternalId(),
      sampleId: this.repo.nextSampleCode(),
      equipmentId,
      lubricationPointId: null,
      labSampleId,
      sampledAt,
      lubricant: input.lubricant?.trim() ?? '',
      contractorId: input.contractorId?.trim() ?? '',
      area: input.area?.trim() ?? '',
      samplingLocation: input.samplingLocation?.trim() ?? '',
      importSource: 'manual',
      status: initialStatus,
      resultStatus: null,
      notes: input.notes?.trim() ?? '',
      ...emptyLabFields(),
      ...emptyPdfFields(),
      approvalStatus: null,
      labValuesLocked: false,
      approvedBy: null,
      approvedAt: null,
      approvalHistory: [],
      lpMappingHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    return this.repo.create(row);
  }

  listLpMappingQueue(): readonly OilSampleRow[] {
    return [...this.list()]
      .filter((s) => s.status === 'needs-lp-mapping' || (!s.lubricationPointId && s.status !== 'linked'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  confirmLpMapping(
    sampleInternalId: string,
    lubricationPointId: string,
    actor: string,
    notes?: string,
  ): OilSampleRow {
    if (!actor.trim()) throw new Error('Engineer name is required.');

    const lpId = lubricationPointId.trim();
    if (!lpId) throw new Error('LP ID is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    if (existing.lubricationPointId) {
      throw new Error('Sample already has a confirmed LP mapping.');
    }
    assertCanConfirmLp(existing.status, 'confirm LP mapping');

    const lp = lubricationPointService.list().find(
      (point) => point.lubricationPointId === lpId && point.isActive,
    );
    if (!lp) throw new Error(`LP ID '${lpId}' is not registered.`);
    if (lp.equipmentId !== existing.equipmentId) {
      throw new Error(`LP ID '${lpId}' does not belong to equipment '${existing.equipmentId}'.`);
    }

    const fromStatus = existing.status;
    const toStatus: OilSampleRowStatus = 'linked';
    assertSampleStatusTransition(fromStatus, toStatus, 'confirm LP mapping');

    const audit = applySampleAudit(existing, {
      kind: 'lp-mapping',
      action: 'confirmed',
      actor: actor.trim(),
      fromSampleStatus: fromStatus,
      toSampleStatus: toStatus,
      lubricationPointId: lpId,
      reason: notes?.trim(),
    });

    return this.repo.update(sampleInternalId, {
      lubricationPointId: lpId,
      status: toStatus,
      ...audit,
    });
  }

  listForPdfReview(): readonly OilSampleRow[] {
    return [...this.list()]
      .filter((s) => s.pdfImportStatus === 'pending-review')
      .sort((a, b) => (b.pdfUploadedAt ?? '').localeCompare(a.pdfUploadedAt ?? ''));
  }

  attachPdfImport(sampleInternalId: string, input: OilPdfImportInput): OilSampleRow {
    if (!sampleInternalId.trim()) throw new Error('Sample is required.');

    const pdfFileUrl = input.pdfFileUrl.trim();
    if (!pdfFileUrl) throw new Error('PDF URL is required.');
    if (!isValidPdfUrl(pdfFileUrl)) throw new Error('PDF URL must be a valid http or https link.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');

    const pdfFileName = input.pdfFileName?.trim() ?? '';
    const now = isoNow();

    return this.repo.update(sampleInternalId, {
      importSource: 'pdf-import',
      pdfFileName: pdfFileName.length > 0 ? pdfFileName : null,
      pdfFileUrl,
      pdfUploadedAt: now,
      pdfImportStatus: 'pending-review',
      pdfReviewNotes: '',
    });
  }

  reviewPdfImport(sampleInternalId: string, reviewNotes?: string): OilSampleRow {
    if (!sampleInternalId.trim()) throw new Error('Sample is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    if (existing.pdfImportStatus !== 'pending-review') {
      throw new Error('Sample PDF is not pending review.');
    }

    return this.repo.update(sampleInternalId, {
      pdfImportStatus: 'reviewed',
      pdfReviewNotes: reviewNotes?.trim() ?? '',
    });
  }

  rejectPdfImport(sampleInternalId: string, reason: string): OilSampleRow {
    if (!sampleInternalId.trim()) throw new Error('Sample is required.');

    const rejectReason = reason.trim();
    if (!rejectReason) throw new Error('Reject reason is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    if (existing.pdfImportStatus !== 'pending-review') {
      throw new Error('Sample PDF is not pending review.');
    }

    return this.repo.update(sampleInternalId, {
      pdfImportStatus: 'rejected',
      pdfReviewNotes: rejectReason,
    });
  }

  saveLabResults(sampleInternalId: string, input: OilLabResultInput, actor = 'System'): OilSampleRow {
    if (!sampleInternalId.trim()) throw new Error('Sample is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    if (isLabValuesLocked(existing)) {
      throw new Error('Laboratory values are locked and cannot be edited.');
    }

    assertCanEnterLabResults(existing.status, existing.lubricationPointId, 'save lab results');
    validateNumericFields(input);

    const { resultStatus, conditionStatus } = resolveLabResultStatus(input);
    const fromSampleStatus = existing.status;
    assertSampleStatusTransition(fromSampleStatus, conditionStatus, 'save lab results');

    const now = isoNow();
    const approvalState = resolvePostLabApprovalState(actor);
    assertApprovalStatusTransition(
      existing.approvalStatus,
      approvalState.approvalStatus,
      'save lab results',
    );
    const audit = applySampleAudit(existing, {
      kind: 'status',
      action: isApprovalWorkflowEnabled() ? 'lab-results-entered' : 'auto-approved',
      actor: actor.trim() || 'System',
      fromApprovalStatus: existing.approvalStatus,
      toApprovalStatus: approvalState.approvalStatus,
      reason: isApprovalWorkflowEnabled()
        ? `Condition evaluated as ${resultStatus}; awaiting engineer review.`
        : `Condition evaluated as ${resultStatus}; auto-approved (workflow disabled).`,
    });

    return this.repo.update(sampleInternalId, {
      status: conditionStatus,
      resultStatus,
      contaminationRating: input.contaminationRating.trim(),
      equipmentRating: input.equipmentRating.trim(),
      lubricantRating: input.lubricantRating.trim(),
      ironPpm: input.ironPpm,
      copperPpm: input.copperPpm,
      siliconPpm: input.siliconPpm,
      pqIndex: input.pqIndex,
      viscosity100c: input.viscosity100c,
      tan: input.tan,
      oxidation: input.oxidation,
      waterPercent: input.waterPercent,
      particle4: input.particle4,
      particle6: input.particle6,
      particle14: input.particle14,
      sampleAnalysis: input.sampleAnalysis.trim(),
      alertType: input.alertType.trim(),
      labResultEnteredAt: now,
      approvalStatus: approvalState.approvalStatus,
      labValuesLocked: approvalState.labValuesLocked,
      approvedBy: approvalState.approvedBy,
      approvedAt: approvalState.approvedAt,
      ...audit,
    });
  }

  listPendingReviewQueue(): readonly OilSampleRow[] {
    if (!isApprovalWorkflowEnabled()) return [];
    return [...this.list()]
      .filter((s) => hasLabResults(s) && s.approvalStatus === 'pending')
      .sort((a, b) => (b.labResultEnteredAt ?? '').localeCompare(a.labResultEnteredAt ?? ''));
  }

  listReadyForApprovalQueue(): readonly OilSampleRow[] {
    if (!isApprovalWorkflowEnabled()) return [];
    return [...this.list()]
      .filter((s) => hasLabResults(s) && s.approvalStatus === 'under-review')
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }

  openSampleForReview(sampleInternalId: string, actor: string): OilSampleRow {
    if (!actor.trim()) throw new Error('Reviewer name is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    if (!hasLabResults(existing)) throw new Error('Sample has no lab results to review.');
    assertCanOpenReview(existing.approvalStatus, 'open for review');

    const fromStatus = existing.approvalStatus ?? 'pending';
    const toStatus: OilSampleApprovalStatus = 'under-review';
    assertApprovalStatusTransition(fromStatus, toStatus, 'open for review');

    const audit = applySampleAudit(existing, {
      kind: 'approval',
      action: 'opened',
      actor: actor.trim(),
      fromApprovalStatus: fromStatus,
      toApprovalStatus: toStatus,
    });

    return this.repo.update(sampleInternalId, {
      approvalStatus: toStatus,
      ...audit,
    });
  }

  editBeforeApproval(
    sampleInternalId: string,
    actor: string,
    input: OilSampleReviewEditInput,
  ): OilSampleRow {
    if (!actor.trim()) throw new Error('Reviewer name is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    if (isLabValuesLocked(existing)) {
      throw new Error('Laboratory values are locked and cannot be edited.');
    }
    assertCanReviewAction(existing.approvalStatus, 'edit');

    const fromStatus = existing.approvalStatus ?? 'under-review';
    const labResults = input.labResults;

    const audit = applySampleAudit(existing, {
      kind: 'approval',
      action: 'edited',
      actor: actor.trim(),
      fromApprovalStatus: fromStatus,
      toApprovalStatus: fromStatus,
      reason: 'Engineer updated sample before approval.',
    });

    return this.repo.update(sampleInternalId, {
      ...audit,
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
      ...(input.lubricant !== undefined ? { lubricant: input.lubricant.trim() } : {}),
      ...(input.samplingLocation !== undefined
        ? { samplingLocation: input.samplingLocation.trim() }
        : {}),
      ...(labResults
        ? (() => {
            validateNumericFields(labResults);
            const { resultStatus, conditionStatus } = resolveLabResultStatus(labResults);
            assertSampleStatusTransition(existing.status, conditionStatus, 'edit lab results');
            return {
              status: conditionStatus,
              resultStatus,
              contaminationRating: labResults.contaminationRating.trim(),
              equipmentRating: labResults.equipmentRating.trim(),
              lubricantRating: labResults.lubricantRating.trim(),
              ironPpm: labResults.ironPpm,
              copperPpm: labResults.copperPpm,
              siliconPpm: labResults.siliconPpm,
              pqIndex: labResults.pqIndex,
              viscosity100c: labResults.viscosity100c,
              tan: labResults.tan,
              oxidation: labResults.oxidation,
              waterPercent: labResults.waterPercent,
              particle4: labResults.particle4,
              particle6: labResults.particle6,
              particle14: labResults.particle14,
              sampleAnalysis: labResults.sampleAnalysis.trim(),
              alertType: labResults.alertType.trim(),
              labResultEnteredAt: isoNow(),
            };
          })()
        : {}),
    });
  }

  approveSample(sampleInternalId: string, actor: string): OilSampleRow {
    if (!actor.trim()) throw new Error('Reviewer name is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    if (!hasLabResults(existing)) throw new Error('Sample has no lab results to approve.');
    assertCanReviewAction(existing.approvalStatus, 'approve');

    const fromStatus = existing.approvalStatus ?? 'under-review';
    const approvedStatus: OilSampleApprovalStatus = 'approved';
    assertApprovalStatusTransition(fromStatus, approvedStatus, 'approve');

    const now = isoNow();
    const approvedAudit = applySampleAudit(existing, {
      kind: 'approval',
      action: 'approved',
      actor: actor.trim(),
      fromApprovalStatus: fromStatus,
      toApprovalStatus: approvedStatus,
    });

    const approvedRow = this.repo.update(sampleInternalId, {
      approvalStatus: approvedStatus,
      labValuesLocked: true,
      approvedBy: actor.trim(),
      approvedAt: now,
      ...approvedAudit,
    });

    return this.lockSample(sampleInternalId, actor.trim(), approvedRow);
  }

  rejectSample(sampleInternalId: string, reason: string, actor: string): OilSampleRow {
    if (!actor.trim()) throw new Error('Reviewer name is required.');
    const rejectReason = reason.trim();
    if (!rejectReason) throw new Error('Reject reason is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    assertCanReviewAction(existing.approvalStatus, 'reject');

    const fromStatus = existing.approvalStatus ?? 'under-review';
    const toStatus: OilSampleApprovalStatus = 'pending';
    assertApprovalStatusTransition(fromStatus, toStatus, 'reject');

    const audit = applySampleAudit(existing, {
      kind: 'approval',
      action: 'rejected',
      actor: actor.trim(),
      fromApprovalStatus: fromStatus,
      toApprovalStatus: toStatus,
      reason: rejectReason,
    });

    return this.repo.update(sampleInternalId, {
      approvalStatus: toStatus,
      labValuesLocked: false,
      approvedBy: null,
      approvedAt: null,
      ...audit,
    });
  }

  returnForCorrection(sampleInternalId: string, reason: string, actor: string): OilSampleRow {
    if (!actor.trim()) throw new Error('Reviewer name is required.');
    const correctionReason = reason.trim();
    if (!correctionReason) throw new Error('Correction reason is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');
    assertCanReviewAction(existing.approvalStatus, 'return for correction');

    const fromStatus = existing.approvalStatus ?? 'under-review';
    const toStatus: OilSampleApprovalStatus = 'pending';
    assertApprovalStatusTransition(fromStatus, toStatus, 'return for correction');

    const audit = applySampleAudit(existing, {
      kind: 'approval',
      action: 'returned-for-correction',
      actor: actor.trim(),
      fromApprovalStatus: fromStatus,
      toApprovalStatus: toStatus,
      reason: correctionReason,
    });

    return this.repo.update(sampleInternalId, {
      approvalStatus: toStatus,
      labValuesLocked: false,
      approvedBy: null,
      approvedAt: null,
      ...audit,
    });
  }

  private lockSample(
    sampleInternalId: string,
    actor: string,
    approvedRow: OilSampleRow,
  ): OilSampleRow {
    const fromStatus: OilSampleApprovalStatus = 'approved';
    const toStatus: OilSampleApprovalStatus = 'locked';
    assertApprovalStatusTransition(fromStatus, toStatus, 'lock');

    const audit = applySampleAudit(approvedRow, {
      kind: 'approval',
      action: 'locked',
      actor,
      fromApprovalStatus: fromStatus,
      toApprovalStatus: toStatus,
    });

    return this.repo.update(sampleInternalId, {
      approvalStatus: toStatus,
      labValuesLocked: true,
      ...audit,
    });
  }

  filter(params: OilSampleFilterParams): readonly OilSampleRow[] {
    const q = params.search?.trim().toLowerCase() ?? '';
    return this.list().filter((row) => {
      if (q) {
        const haystack = [
          row.sampleId,
          row.equipmentId,
          row.labSampleId,
          row.lubricationPointId ?? '',
          row.samplingLocation,
          row.lubricant,
          row.notes,
          row.area,
          row.contractorId,
          row.sampleAnalysis,
          row.alertType,
          row.pdfFileName ?? '',
          row.pdfReviewNotes,
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (params.status && row.status !== params.status) return false;
      if (params.area && row.area !== params.area) return false;
      if (params.contractor && row.contractorId !== params.contractor) return false;
      if (params.condition && computeSampleCondition(row) !== params.condition) return false;
      return true;
    });
  }

  computeRegistryKpis(rows?: readonly OilSampleRow[]): OilSampleRegistryKpis {
    const samples = rows ?? this.list();
    return {
      total: samples.length,
      pendingReview: samples.filter(
        (s) =>
          s.status === 'pending-review' ||
          s.status === 'imported' ||
          s.status === 'linked' ||
          s.status === 'needs-lp-mapping',
      ).length,
      needsLpMapping: samples.filter((s) => !s.lubricationPointId).length,
      critical: samples.filter(isCriticalSample).length,
    };
  }

  computeDashboardKpis(): OilAnalysisDashboardKpis {
    const samples = this.list();
    const ym = currentYearMonth();

    const pendingReview = samples.filter(
      (s) =>
        s.status === 'pending-review' ||
        s.status === 'imported' ||
        s.status === 'linked' ||
        s.status === 'needs-lp-mapping',
    ).length;

    const pdfPendingReview = samples.filter(
      (s) => s.pdfImportStatus === 'pending-review',
    ).length;

    const needsLpMapping = samples.filter((s) => !s.lubricationPointId).length;
    const critical = samples.filter(isCriticalSample).length;

    const completedThisMonth = samples.filter(
      (s) => hasLabResults(s) && s.sampledAt.startsWith(ym),
    ).length;

    const openRecommendations = samples.filter(isRecommendationOpen).length;

    const pendingApproval = isApprovalWorkflowEnabled()
      ? samples.filter(
          (s) => hasLabResults(s) && (s.approvalStatus === 'pending' || s.approvalStatus === 'under-review'),
        ).length
      : 0;

    const today = todayDateString();
    const approvedToday = samples.filter(
      (s) => s.approvedAt !== null && s.approvedAt.startsWith(today),
    ).length;

    return {
      totalSamples: samples.length,
      pendingReview,
      pdfPendingReview,
      needsLpMapping,
      critical,
      completedThisMonth,
      openRecommendations,
      pendingApproval,
      approvedToday,
    };
  }
}

export const oilSampleService = new OilSampleLocalService(
  new OilSampleLocalRepository(),
);
