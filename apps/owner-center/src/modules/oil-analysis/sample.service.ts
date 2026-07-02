// apps/owner-center/src/modules/oil-analysis/sample.service.ts
// Local-storage-backed service for Oil Analysis samples.
//
// Sprint 01 — module scaffold.
// Sprint 02 — sample registry, intake, validation, KPIs.
// Sprint 03 — lab results manual entry.
//
// React components MUST NOT access localStorage directly; they call the service.

// ── View model ────────────────────────────────────────────────────────────────

/** Lab result classification after manual entry. */
export type OilLabResultStatus = 'normal' | 'monitor' | 'caution' | 'critical';

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

export type SampleCondition = 'pending' | 'normal' | 'caution' | 'alert';

/** Dashboard KPI snapshot computed from persisted samples. */
export interface OilAnalysisDashboardKpis {
  readonly totalSamples: number;
  readonly pendingReview: number;
  readonly needsLpMapping: number;
  readonly critical: number;
  readonly completedThisMonth: number;
  readonly openRecommendations: number;
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
  readonly lubricationPointId?: string | null;
  readonly labSampleId: string;
  readonly sampledAt: string;
  readonly lubricant?: string;
  readonly contractorId?: string;
  readonly area?: string;
  readonly samplingLocation?: string;
  readonly status: 'imported' | 'pending-review';
  readonly notes?: string;
}

export interface OilLabResultInput {
  readonly resultStatus: OilLabResultStatus;
  readonly contaminationRating: string;
  readonly equipmentRating: string;
  readonly lubricantRating: string;
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

function emptyLabFields(): Pick<
  OilSampleRow,
  | 'contaminationRating'
  | 'equipmentRating'
  | 'lubricantRating'
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

/** Derive display condition from status and result fields. */
export function computeSampleCondition(row: OilSampleRow): SampleCondition {
  if (row.resultStatus === 'critical') return 'alert';
  if (row.resultStatus === 'caution' || row.resultStatus === 'monitor') return 'caution';
  if (row.resultStatus === 'normal' || row.status === 'analysed') return 'normal';
  if (row.status === 'alert') return 'alert';
  if (row.status === 'caution') return 'caution';
  if (row.status === 'normal') return 'normal';
  return 'pending';
}

export function hasLabResults(row: OilSampleRow): boolean {
  return row.resultStatus !== null && row.status === 'analysed';
}

function normalizeRow(
  raw: Partial<OilSampleRow> & { labReferenceId?: string | null },
): OilSampleRow {
  const labSampleId =
    (typeof raw.labSampleId === 'string' && raw.labSampleId.trim()) ||
    (typeof raw.labReferenceId === 'string' && raw.labReferenceId.trim()) ||
    '';

  const labDefaults = emptyLabFields();

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
    createdAt: raw.createdAt ?? isoNow(),
    updatedAt: raw.updatedAt ?? isoNow(),
  };
}

function isActiveSample(row: OilSampleRow): boolean {
  return row.status !== 'cancelled';
}

function isCriticalSample(row: OilSampleRow): boolean {
  return row.resultStatus === 'critical' || row.status === 'alert';
}

function isRecommendationOpen(row: OilSampleRow): boolean {
  return (
    row.resultStatus === 'caution' ||
    row.resultStatus === 'monitor' ||
    row.status === 'caution'
  );
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
    const prefix = `OA-${year}-`;
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

    const labSampleId = input.labSampleId.trim();
    if (!labSampleId) throw new Error('Lab Sample ID is required.');

    const sampledAt = input.sampledAt.trim();
    if (!sampledAt) throw new Error('Sample date is required.');
    if (isFutureDate(sampledAt)) throw new Error('Sample date cannot be in the future.');

    if (this.isLabSampleIdDuplicate(labSampleId)) {
      throw new Error(`Lab Sample ID '${labSampleId}' already exists.`);
    }

    const lpId = input.lubricationPointId?.trim() ?? '';
    const now = isoNow();
    const row: OilSampleRow = {
      id: generateInternalId(),
      sampleId: this.repo.nextSampleCode(),
      equipmentId,
      lubricationPointId: lpId.length > 0 ? lpId : null,
      labSampleId,
      sampledAt,
      lubricant: input.lubricant?.trim() ?? '',
      contractorId: input.contractorId?.trim() ?? '',
      area: input.area?.trim() ?? '',
      samplingLocation: input.samplingLocation?.trim() ?? '',
      importSource: 'manual',
      status: input.status,
      resultStatus: null,
      notes: input.notes?.trim() ?? '',
      ...emptyLabFields(),
      createdAt: now,
      updatedAt: now,
    };

    return this.repo.create(row);
  }

  saveLabResults(sampleInternalId: string, input: OilLabResultInput): OilSampleRow {
    if (!sampleInternalId.trim()) throw new Error('Sample is required.');

    const existing = this.findById(sampleInternalId);
    if (!existing) throw new Error('Sample not found.');

    if (!input.resultStatus) throw new Error('Result status is required.');

    validateNumericFields(input);

    const now = isoNow();
    return this.repo.update(sampleInternalId, {
      status: 'analysed',
      resultStatus: input.resultStatus,
      contaminationRating: input.contaminationRating.trim(),
      equipmentRating: input.equipmentRating.trim(),
      lubricantRating: input.lubricantRating.trim(),
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
        (s) => s.status === 'pending-review' || s.status === 'imported' || s.status === 'linked',
      ).length,
      needsLpMapping: samples.filter((s) => !s.lubricationPointId).length,
      critical: samples.filter(isCriticalSample).length,
    };
  }

  computeDashboardKpis(): OilAnalysisDashboardKpis {
    const samples = this.list();
    const ym = currentYearMonth();

    const pendingReview = samples.filter(
      (s) => s.status === 'pending-review' || s.status === 'imported' || s.status === 'linked',
    ).length;

    const needsLpMapping = samples.filter((s) => !s.lubricationPointId).length;
    const critical = samples.filter(isCriticalSample).length;

    const completedThisMonth = samples.filter(
      (s) => s.status === 'analysed' && s.sampledAt.startsWith(ym),
    ).length;

    const openRecommendations = samples.filter(isRecommendationOpen).length;

    return {
      totalSamples: samples.length,
      pendingReview,
      needsLpMapping,
      critical,
      completedThisMonth,
      openRecommendations,
    };
  }
}

export const oilSampleService = new OilSampleLocalService(
  new OilSampleLocalRepository(),
);
