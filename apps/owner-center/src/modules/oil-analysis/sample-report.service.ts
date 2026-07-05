// apps/owner-center/src/modules/oil-analysis/sample-report.service.ts
// OA-003 Oil Sample Report — aggregates samples, trends, and lab display context.

import { getPlatformSdk } from '../platform/platform-master-access';
import { findEquipmentById } from './equipment-master.service';
import type { OilAnalysisContractorScope } from './contractor-scope';
import {
  oilSampleService,
  computeSampleCondition,
  parseRatingLevel,
  type OilSampleRow,
  type SampleCondition,
} from './sample.service';
import { evaluateParameterCondition } from './threshold-engine';
import type { OilAnalysisParameterId } from './settings-types';
import type { LpRegisterConditionStatus } from './lp-register.service';
import { listOilChangeEvents } from './trend.service';
import { oilChangeService } from '../oil-lubrication/oil-change.service';
import type { OcRecord } from '../oil-lubrication/oil-change.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LabCellColor = 'green' | 'yellow' | 'red';

export interface SampleReportTrendColumn {
  readonly key: string;
  readonly label: string;
  readonly sampleDate: string;
  readonly labSampleId: string;
  readonly isSelected: boolean;
  readonly isDisplayOnly: boolean;
  readonly sampleInternalId: string | null;
}

export interface SampleReportTrendCell {
  readonly value: string;
  readonly color: LabCellColor | null;
}

export type SampleReportTrendGroup =
  | 'sample-info'
  | 'lubricant'
  | 'wear'
  | 'contaminants'
  | 'additives'
  | 'viscosity'
  | 'physical';

export interface SampleReportTrendRow {
  readonly id: string;
  readonly group: SampleReportTrendGroup;
  readonly groupLabel: string;
  readonly label: string;
  readonly unit: string;
  readonly cells: readonly SampleReportTrendCell[];
}

export interface SampleReportChartPoint {
  readonly at: string;
  readonly value: number;
}

export interface SampleReportChartSeries {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly points: readonly SampleReportChartPoint[];
}

export type SampleReportChartGroupId =
  | 'viscosity'
  | 'wear'
  | 'contaminants'
  | 'physical'
  | 'additives';

export interface SampleReportChartGroup {
  readonly id: SampleReportChartGroupId;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly series: readonly SampleReportChartSeries[];
}

export interface SampleReportInfoField {
  readonly labelEn: string;
  readonly labelAr: string;
  readonly value: string;
}

export interface SampleReportOilChangeStrip {
  readonly lastOilChange: string | null;
  readonly oilType: string;
  readonly brand: string;
  readonly nextDue: string | null;
  readonly performedBy: string;
}

export interface SampleReportActionRow {
  readonly id: string;
  readonly actionNumber: string;
  readonly revisionDate: string;
  readonly sampleDate: string;
  readonly sampleResult: string;
  readonly sampleResultVariant: LpRegisterConditionStatus;
  readonly status: string;
  readonly agreedAction: string;
  readonly completedDate: string | null;
}

export interface SampleReportTimelineItem {
  readonly id: string;
  readonly date: string;
  readonly labelEn: string;
  readonly labelAr: string;
  readonly status: LpRegisterConditionStatus;
  readonly detailEn: string;
  readonly detailAr: string;
}

export interface SampleReportView {
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly lpId: string;
  readonly lpName: string;
  readonly area: string;
  readonly contractorId: string;
  readonly reportStatus: string;
  readonly reportStatusVariant: LpRegisterConditionStatus;
  readonly selectedSampleInternalId: string;
  readonly selectedSampleCode: string;
  readonly selectedLabSampleId: string;
  readonly selectedSampleDate: string;
  readonly pdfFileUrl: string | null;
  readonly sampleCount: number;
  readonly oilChangeStrip: SampleReportOilChangeStrip;
  readonly accountInfo: readonly SampleReportInfoField[];
  readonly sampleInfo: readonly SampleReportInfoField[];
  readonly equipmentInfo: readonly SampleReportInfoField[];
  readonly unitStrip: readonly SampleReportInfoField[];
  readonly trendColumns: readonly SampleReportTrendColumn[];
  readonly trendRows: readonly SampleReportTrendRow[];
  readonly chartGroups: readonly SampleReportChartGroup[];
  readonly recommendations: string;
  readonly timeline: readonly SampleReportTimelineItem[];
  readonly lastActions: readonly SampleReportActionRow[];
}

export type SampleReportResult =
  | { readonly kind: 'ok'; readonly data: SampleReportView }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'forbidden' };

// ── Optional PDF display context (forward-compatible, not persisted in schema) ─

interface PdfTrendDisplayCell {
  readonly value?: string | number | null;
  readonly color?: LabCellColor | null;
}

interface PdfTrendDisplayColumn {
  readonly sampledAt: string;
  readonly labSampleId?: string;
  readonly reportStatus?: string;
  readonly displayOnly?: boolean;
  readonly cells?: Readonly<Record<string, PdfTrendDisplayCell>>;
}

const STORAGE_KEY = 'acc.oil-analysis.samples.v1';

const TREND_COLUMN_LIMIT = 5;

const GROUP_LABELS: Record<SampleReportTrendGroup, { en: string; ar: string }> = {
  'sample-info': { en: 'Sample Info', ar: 'معلومات العينة' },
  lubricant: { en: 'Lubricant', ar: 'المزلق' },
  wear: { en: 'Wear (ppm)', ar: 'التآكل (ppm)' },
  contaminants: { en: 'Contaminants (ppm)', ar: 'الملوثات (ppm)' },
  additives: { en: 'Additives (ppm)', ar: 'الإضافات (ppm)' },
  viscosity: { en: 'Viscosity', ar: 'اللزوجة' },
  physical: { en: 'Physical Properties', ar: 'الخصائص الفيزيائية' },
};

interface TrendParamDef {
  readonly id: string;
  readonly group: SampleReportTrendGroup;
  readonly label: string;
  readonly unit: string;
  readonly sampleField?: keyof OilSampleRow;
  readonly thresholdId?: OilAnalysisParameterId;
  readonly chartGroup?: SampleReportChartGroupId;
  readonly chartLabel?: string;
}

const TREND_PARAMS: readonly TrendParamDef[] = [
  { id: 'reportStatus', group: 'sample-info', label: 'Report Status', unit: '' },
  { id: 'labSampleId', group: 'sample-info', label: 'Sample ID', unit: '' },
  { id: 'sampleDate', group: 'sample-info', label: 'Sample Date', unit: '' },
  { id: 'contaminationRating', group: 'lubricant', label: 'Contamination', unit: '', sampleField: 'contaminationRating' },
  { id: 'equipmentRating', group: 'lubricant', label: 'Equipment', unit: '', sampleField: 'equipmentRating' },
  { id: 'lubricantRating', group: 'lubricant', label: 'Lubricant', unit: '', sampleField: 'lubricantRating' },
  { id: 'particle4', group: 'lubricant', label: 'ISO 4µ', unit: '/mL', sampleField: 'particle4', thresholdId: 'particleCount' },
  { id: 'particle6', group: 'lubricant', label: 'ISO 6µ', unit: '/mL', sampleField: 'particle6', thresholdId: 'particleCount' },
  { id: 'particle14', group: 'lubricant', label: 'ISO 14µ', unit: '/mL', sampleField: 'particle14', thresholdId: 'particleCount' },
  { id: 'pqIndex', group: 'lubricant', label: 'PQ Index', unit: '', sampleField: 'pqIndex', thresholdId: 'pqIndex' },
  { id: 'waterPercent', group: 'lubricant', label: 'Water', unit: '%', sampleField: 'waterPercent', thresholdId: 'water', chartGroup: 'physical', chartLabel: 'Water' },
  { id: 'ag', group: 'wear', label: 'Ag', unit: 'ppm', chartGroup: 'wear', chartLabel: 'Ag' },
  { id: 'al', group: 'wear', label: 'Al', unit: 'ppm', chartGroup: 'wear', chartLabel: 'Al' },
  { id: 'cr', group: 'wear', label: 'Cr', unit: 'ppm', chartGroup: 'wear', chartLabel: 'Cr' },
  { id: 'cu', group: 'wear', label: 'Cu', unit: 'ppm', sampleField: 'copperPpm', thresholdId: 'copper', chartGroup: 'wear', chartLabel: 'Cu' },
  { id: 'fe', group: 'wear', label: 'Fe', unit: 'ppm', sampleField: 'ironPpm', thresholdId: 'iron', chartGroup: 'wear', chartLabel: 'Fe' },
  { id: 'mo', group: 'wear', label: 'Mo', unit: 'ppm', chartGroup: 'wear', chartLabel: 'Mo' },
  { id: 'ni', group: 'wear', label: 'Ni', unit: 'ppm', chartGroup: 'wear', chartLabel: 'Ni' },
  { id: 'pb', group: 'wear', label: 'Pb', unit: 'ppm', chartGroup: 'wear', chartLabel: 'Pb' },
  { id: 'sn', group: 'wear', label: 'Sn', unit: 'ppm', chartGroup: 'wear', chartLabel: 'Sn' },
  { id: 'k', group: 'contaminants', label: 'K', unit: 'ppm', chartGroup: 'contaminants', chartLabel: 'K' },
  { id: 'na', group: 'contaminants', label: 'Na', unit: 'ppm', chartGroup: 'contaminants', chartLabel: 'Na' },
  { id: 'si', group: 'contaminants', label: 'Si', unit: 'ppm', sampleField: 'siliconPpm', thresholdId: 'silicon', chartGroup: 'contaminants', chartLabel: 'Si' },
  { id: 'b', group: 'additives', label: 'B', unit: 'ppm', chartGroup: 'additives', chartLabel: 'B' },
  { id: 'ba', group: 'additives', label: 'Ba', unit: 'ppm', chartGroup: 'additives', chartLabel: 'Ba' },
  { id: 'ca', group: 'additives', label: 'Ca', unit: 'ppm', chartGroup: 'additives', chartLabel: 'Ca' },
  { id: 'mg', group: 'additives', label: 'Mg', unit: 'ppm', chartGroup: 'additives', chartLabel: 'Mg' },
  { id: 'p', group: 'additives', label: 'P', unit: 'ppm', chartGroup: 'additives', chartLabel: 'P' },
  { id: 'zn', group: 'additives', label: 'Zn', unit: 'ppm', chartGroup: 'additives', chartLabel: 'Zn' },
  { id: 'viscosity100c', group: 'viscosity', label: 'Viscosity @ 100°C', unit: 'cSt', sampleField: 'viscosity100c', thresholdId: 'viscosity', chartGroup: 'viscosity', chartLabel: 'Visc @ 100°C' },
  { id: 'tan', group: 'physical', label: 'TAN', unit: '', sampleField: 'tan', thresholdId: 'tan', chartGroup: 'physical', chartLabel: 'TAN' },
  { id: 'oxidation', group: 'physical', label: 'Oxidation', unit: '', sampleField: 'oxidation', thresholdId: 'oxidation', chartGroup: 'physical', chartLabel: 'Oxidation' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function conditionToRegisterStatus(condition: SampleCondition): LpRegisterConditionStatus {
  switch (condition) {
    case 'normal':
      return 'normal';
    case 'monitor':
    case 'caution':
      return 'caution';
    case 'critical':
      return 'alert';
    default:
      return 'pending';
  }
}

function conditionToReportLabel(condition: SampleCondition): string {
  switch (condition) {
    case 'normal':
      return 'Normal';
    case 'monitor':
    case 'caution':
      return 'Caution';
    case 'critical':
      return 'Alert';
    default:
      return 'Pending';
  }
}

function conditionToCellColor(condition: SampleCondition): LabCellColor | null {
  switch (condition) {
    case 'normal':
      return 'green';
    case 'monitor':
    case 'caution':
      return 'yellow';
    case 'critical':
      return 'red';
    default:
      return null;
  }
}

function thresholdToCellColor(level: ReturnType<typeof evaluateParameterCondition>): LabCellColor | null {
  switch (level) {
    case 'normal':
      return 'green';
    case 'monitor':
    case 'caution':
      return 'yellow';
    case 'critical':
      return 'red';
    default:
      return null;
  }
}

function ratingToCellColor(rating: string): LabCellColor | null {
  const level = parseRatingLevel(rating);
  return level ? conditionToCellColor(level) : null;
}

function formatTrendDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCellValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(Number.isInteger(raw) ? raw : Number(raw.toFixed(2)));
  }
  return String(raw).trim();
}

function resolveLpName(lpId: string): string {
  const record = getPlatformSdk().lubricationPoints.findByLpId(lpId);
  return record?.name?.trim() || lpId;
}

function applyContractorFilter(scope: OilAnalysisContractorScope): string | undefined {
  if (!scope.canViewAllContractors) return scope.lockedContractorId;
  return undefined;
}

function samplesForLp(
  equipmentId: string,
  lpId: string,
  contractorId?: string,
): OilSampleRow[] {
  return oilSampleService
    .list()
    .filter((row) => {
      if (row.equipmentId !== equipmentId) return false;
      if (row.lubricationPointId !== lpId) return false;
      if (contractorId && row.contractorId !== contractorId) return false;
      return true;
    })
    .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
}

function readPdfTrendDisplay(sampleInternalId: string): readonly PdfTrendDisplayColumn[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const record = parsed.find(
      (item) => item && typeof item === 'object' && (item as { id?: string }).id === sampleInternalId,
    ) as { pdfTrendDisplay?: unknown } | undefined;
    if (!record?.pdfTrendDisplay || !Array.isArray(record.pdfTrendDisplay)) return [];
    return record.pdfTrendDisplay.filter(
      (col): col is PdfTrendDisplayColumn =>
        Boolean(col && typeof col === 'object' && typeof (col as PdfTrendDisplayColumn).sampledAt === 'string'),
    );
  } catch {
    return [];
  }
}

function readDisplayCell(
  column: PdfTrendDisplayColumn | null,
  paramId: string,
): PdfTrendDisplayCell | null {
  if (!column?.cells) return null;
  return column.cells[paramId] ?? null;
}

function resolveParamValue(
  sample: OilSampleRow | null,
  displayCol: PdfTrendDisplayColumn | null,
  param: TrendParamDef,
): string {
  const displayCell = readDisplayCell(displayCol, param.id);
  if (displayCell?.value !== undefined && displayCell.value !== null && displayCell.value !== '') {
    return formatCellValue(displayCell.value);
  }

  if (param.id === 'reportStatus') {
    return sample ? conditionToReportLabel(computeSampleCondition(sample)) : '';
  }
  if (param.id === 'labSampleId') {
    return sample?.labSampleId ?? displayCol?.labSampleId ?? '';
  }
  if (param.id === 'sampleDate') {
    return sample?.sampledAt ? formatTrendDate(sample.sampledAt) : formatTrendDate(displayCol?.sampledAt ?? '');
  }

  if (param.sampleField && sample) {
    const raw = sample[param.sampleField];
    if (typeof raw === 'number') return formatCellValue(raw);
    if (typeof raw === 'string') return raw.trim();
  }

  return '';
}

function resolveParamColor(
  sample: OilSampleRow | null,
  displayCol: PdfTrendDisplayColumn | null,
  param: TrendParamDef,
  value: string,
): LabCellColor | null {
  const displayCell = readDisplayCell(displayCol, param.id);
  if (displayCell?.color) return displayCell.color;

  if (param.id === 'reportStatus' && sample) {
    return conditionToCellColor(computeSampleCondition(sample));
  }

  if (
    param.sampleField &&
    (param.sampleField === 'contaminationRating'
      || param.sampleField === 'equipmentRating'
      || param.sampleField === 'lubricantRating')
    && sample
  ) {
    const rating = String(sample[param.sampleField] ?? '');
    const color = ratingToCellColor(rating);
    if (color) return color;
  }

  if (param.thresholdId && sample && value) {
    const numeric = Number.parseFloat(value);
    if (Number.isFinite(numeric)) {
      return thresholdToCellColor(evaluateParameterCondition(param.thresholdId, numeric));
    }
  }

  if (sample && !value) return null;

  return null;
}

interface TrendColumnSource {
  readonly key: string;
  readonly sample: OilSampleRow | null;
  readonly displayCol: PdfTrendDisplayColumn | null;
  readonly sampleDate: string;
  readonly labSampleId: string;
  readonly isDisplayOnly: boolean;
  readonly sampleInternalId: string | null;
}

function buildTrendColumnSources(
  samples: readonly OilSampleRow[],
  selectedSample: OilSampleRow,
  displayOnlyColumns: readonly PdfTrendDisplayColumn[],
): TrendColumnSource[] {
  const stored = samples.slice(0, TREND_COLUMN_LIMIT);
  const selectedInList = stored.some((s) => s.id === selectedSample.id);
  const workingStored = selectedInList
    ? stored
    : [selectedSample, ...stored.filter((s) => s.id !== selectedSample.id)].slice(0, TREND_COLUMN_LIMIT);

  const sources: TrendColumnSource[] = workingStored.map((sample) => ({
    key: sample.id,
    sample,
    displayCol: null,
    sampleDate: sample.sampledAt,
    labSampleId: sample.labSampleId,
    isDisplayOnly: false,
    sampleInternalId: sample.id,
  }));

  for (const displayCol of displayOnlyColumns) {
    if (!displayCol.displayOnly) continue;
    const duplicate = sources.some(
      (src) =>
        (displayCol.labSampleId && src.labSampleId === displayCol.labSampleId)
        || src.sampleDate === displayCol.sampledAt,
    );
    if (duplicate) continue;
    sources.push({
      key: `display-${displayCol.sampledAt}-${displayCol.labSampleId ?? 'na'}`,
      sample: null,
      displayCol,
      sampleDate: displayCol.sampledAt,
      labSampleId: displayCol.labSampleId ?? '—',
      isDisplayOnly: true,
      sampleInternalId: null,
    });
  }

  return sources
    .sort((a, b) => a.sampleDate.localeCompare(b.sampleDate))
    .slice(-TREND_COLUMN_LIMIT);
}

function buildTrendRows(sources: readonly TrendColumnSource[]): SampleReportTrendRow[] {
  let lastGroup: SampleReportTrendGroup | null = null;

  return TREND_PARAMS.map((param) => {
    const groupLabel = GROUP_LABELS[param.group];
    const showGroupLabel = param.group !== lastGroup;
    lastGroup = param.group;

    return {
      id: param.id,
      group: param.group,
      groupLabel: showGroupLabel ? groupLabel.en : '',
      label: param.label,
      unit: param.unit,
      cells: sources.map((source) => {
        const value = resolveParamValue(source.sample, source.displayCol, param);
        const color = resolveParamColor(source.sample, source.displayCol, param, value);
        return { value, color };
      }),
    };
  });
}

function buildChartGroups(
  sources: readonly TrendColumnSource[],
  trendRows: readonly SampleReportTrendRow[],
): SampleReportChartGroup[] {
  const rowById = new Map(trendRows.map((row) => [row.id, row]));
  const groupDefs: readonly { id: SampleReportChartGroupId; labelEn: string; labelAr: string }[] = [
    { id: 'viscosity', labelEn: 'Viscosity', labelAr: 'اللزوجة' },
    { id: 'wear', labelEn: 'Wear', labelAr: 'التآكل' },
    { id: 'contaminants', labelEn: 'Contaminants', labelAr: 'الملوثات' },
    { id: 'physical', labelEn: 'Physical Properties', labelAr: 'الخصائص الفيزيائية' },
    { id: 'additives', labelEn: 'Additives', labelAr: 'الإضافات' },
  ];

  return groupDefs.map((groupDef) => {
    const params = TREND_PARAMS.filter((p) => p.chartGroup === groupDef.id);
    const series: SampleReportChartSeries[] = [];

    for (const param of params) {
      const row = rowById.get(param.id);
      if (!row) continue;
      const points: SampleReportChartPoint[] = [];
      sources.forEach((source, index) => {
        const cell = row.cells[index];
        const numeric = cell ? Number.parseFloat(cell.value) : Number.NaN;
        if (!Number.isFinite(numeric)) return;
        points.push({ at: source.sampleDate, value: numeric });
      });
      if (points.length < 2) continue;
      series.push({
        id: param.id,
        label: param.chartLabel ?? param.label,
        unit: param.unit,
        points,
      });
    }

    return {
      id: groupDef.id,
      labelEn: groupDef.labelEn,
      labelAr: groupDef.labelAr,
      series,
    };
  });
}

function buildOilChangeStrip(equipmentId: string, lpId: string, oilType: string): SampleReportOilChangeStrip {
  const records = oilChangeService
    .listRecords()
    .filter(
      (record: OcRecord) =>
        record.equipmentId === equipmentId
        && record.lpId === lpId
        && record.status === 'completed',
    )
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

  const latest = records[0] ?? null;
  const task = oilChangeService.listTasks().find((t) => t.lpId === lpId) ?? null;

  return {
    lastOilChange: latest?.performedAt.slice(0, 10) ?? task?.lastChangeDate ?? null,
    oilType: latest?.oilTypeUsed || oilType || '—',
    brand: task?.oilType?.trim() || '—',
    nextDue: task?.dueDate?.slice(0, 10) ?? null,
    performedBy: latest?.technicianName?.trim() || '—',
  };
}

function buildRecommendations(sample: OilSampleRow): string {
  const analysis = sample.sampleAnalysis.trim();
  if (analysis) return analysis;
  return sample.notes.trim();
}

function buildLastActions(
  samples: readonly OilSampleRow[],
): SampleReportActionRow[] {
  return samples
    .filter((sample) => sample.alertType.trim().length > 0)
    .slice(0, 5)
    .map((sample) => {
      const condition = computeSampleCondition(sample);
      const statusVariant = conditionToRegisterStatus(condition);
      return {
        id: sample.id,
        actionNumber: sample.sampleId,
        revisionDate: sample.updatedAt.slice(0, 10),
        sampleDate: sample.sampledAt,
        sampleResult: conditionToReportLabel(condition),
        sampleResultVariant: statusVariant,
        status: sample.status === 'alert' ? 'Open' : 'Monitoring',
        agreedAction: sample.alertType.trim(),
        completedDate: sample.approvalStatus === 'locked' ? sample.approvedAt?.slice(0, 10) ?? null : null,
      };
    });
}

function buildTimeline(
  samples: readonly OilSampleRow[],
  equipmentId: string,
  lpId: string,
): SampleReportTimelineItem[] {
  const recent = samples.slice(0, 5);
  const items: SampleReportTimelineItem[] = recent.map((sample) => {
    const condition = computeSampleCondition(sample);
    const status = conditionToRegisterStatus(condition);
    const vis = formatCellValue(sample.viscosity100c);
    const fe = formatCellValue(sample.ironPpm);
    const si = formatCellValue(sample.siliconPpm);
    const water = formatCellValue(sample.waterPercent);
    const detail = `Sample ${sample.labSampleId} · Visc ${vis || '—'} · Fe ${fe || '—'} · Si ${si || '—'} · Water ${water || '—'}%`;
    return {
      id: sample.id,
      date: sample.sampledAt,
      labelEn: `Sample ${formatTrendDate(sample.sampledAt)}`,
      labelAr: `عينة ${formatTrendDate(sample.sampledAt)}`,
      status,
      detailEn: detail,
      detailAr: detail,
    };
  });

  const oilChanges = listOilChangeEvents(equipmentId, lpId);
  for (const change of oilChanges.slice(-3)) {
    items.push({
      id: `oc-${change.at}`,
      date: change.at,
      labelEn: change.label,
      labelAr: change.label,
      status: 'normal',
      detailEn: change.label,
      detailAr: change.label,
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
}

// ── Public API ────────────────────────────────────────────────────────────────

export class SampleReportService {
  load(
    equipmentId: string,
    lpId: string,
    scope: OilAnalysisContractorScope,
    requestedSampleId?: string,
  ): SampleReportResult {
    const eqId = equipmentId.trim();
    const lp = lpId.trim();
    if (!eqId || !lp) return { kind: 'not-found' };

    const equipment = findEquipmentById(eqId);
    if (!equipment) return { kind: 'not-found' };

    const contractorFilter = applyContractorFilter(scope);
    if (contractorFilter && equipment.contractorId !== contractorFilter) {
      return { kind: 'forbidden' };
    }

    const samples = samplesForLp(eqId, lp, contractorFilter);
    if (samples.length === 0) return { kind: 'not-found' };

    const selectedSample = (requestedSampleId
      ? samples.find((s) => s.id === requestedSampleId || s.sampleId === requestedSampleId)
      : null) ?? samples[0]!;

    const displayOnlyColumns = readPdfTrendDisplay(selectedSample.id);
    const columnSources = buildTrendColumnSources(samples, selectedSample, displayOnlyColumns);
    const trendColumns: SampleReportTrendColumn[] = columnSources.map((source) => ({
      key: source.key,
      label: formatTrendDate(source.sampleDate),
      sampleDate: source.sampleDate,
      labSampleId: source.labSampleId,
      isSelected: source.sampleInternalId === selectedSample.id,
      isDisplayOnly: source.isDisplayOnly,
      sampleInternalId: source.sampleInternalId,
    }));

    const trendRows = buildTrendRows(columnSources);
    const chartGroups = buildChartGroups(columnSources, trendRows);

    const lpRecord = getPlatformSdk().lubricationPoints.findByLpId(lp);
    const task = oilChangeService.listTasks().find((t) => t.lpId === lp);
    const oilType = selectedSample.lubricant.trim() || task?.oilType || lpRecord?.lubricant?.trim() || '—';

    const selectedCondition = computeSampleCondition(selectedSample);
    const reportStatusVariant = conditionToRegisterStatus(selectedCondition);

    const accountInfo: SampleReportInfoField[] = [
      { labelEn: 'Account ID', labelAr: 'معرّف الحساب', value: equipment.contractorId || '—' },
      { labelEn: 'Account Name', labelAr: 'اسم الحساب', value: equipment.contractorId || '—' },
      { labelEn: 'Area', labelAr: 'المنطقة', value: equipment.area || selectedSample.area || '—' },
    ];

    const sampleInfo: SampleReportInfoField[] = [
      { labelEn: 'Sample ID', labelAr: 'معرّف العينة', value: selectedSample.labSampleId || '—' },
      { labelEn: 'System Sample', labelAr: 'رمز العينة', value: selectedSample.sampleId || '—' },
      { labelEn: 'Sample Date', labelAr: 'تاريخ العينة', value: formatTrendDate(selectedSample.sampledAt) },
      { labelEn: 'Tested Lubricant', labelAr: 'المزلق المختبر', value: oilType },
    ];

    const equipmentInfo: SampleReportInfoField[] = [
      { labelEn: 'Equipment ID', labelAr: 'معرّف المعدة', value: equipment.equipmentId },
      { labelEn: 'Equipment Name', labelAr: 'اسم المعدة', value: equipment.equipmentName },
      { labelEn: 'LP_ID', labelAr: 'LP_ID', value: lp },
      { labelEn: 'LP Name', labelAr: 'اسم نقطة التشحيم', value: resolveLpName(lp) },
      { labelEn: 'Sampling Location', labelAr: 'موقع أخذ العينة', value: selectedSample.samplingLocation.trim() || '—' },
    ];

    const unitStrip: SampleReportInfoField[] = [
      { labelEn: 'Unit ID', labelAr: 'معرّف الوحدة', value: lp },
      { labelEn: 'Description', labelAr: 'الوصف', value: resolveLpName(lp) },
      { labelEn: 'Sampling Interval', labelAr: 'فترة أخذ العينات', value: task?.frequencyDays ? `${task.frequencyDays} days` : '—' },
    ];

    return {
      kind: 'ok',
      data: {
        equipmentId: equipment.equipmentId,
        equipmentName: equipment.equipmentName,
        lpId: lp,
        lpName: resolveLpName(lp),
        area: equipment.area,
        contractorId: equipment.contractorId,
        reportStatus: conditionToReportLabel(selectedCondition),
        reportStatusVariant,
        selectedSampleInternalId: selectedSample.id,
        selectedSampleCode: selectedSample.sampleId,
        selectedLabSampleId: selectedSample.labSampleId,
        selectedSampleDate: selectedSample.sampledAt,
        pdfFileUrl: selectedSample.pdfFileUrl,
        sampleCount: columnSources.length,
        oilChangeStrip: buildOilChangeStrip(eqId, lp, oilType),
        accountInfo,
        sampleInfo,
        equipmentInfo,
        unitStrip,
        trendColumns,
        trendRows,
        chartGroups,
        recommendations: buildRecommendations(selectedSample),
        timeline: buildTimeline(samples, eqId, lp),
        lastActions: buildLastActions(samples),
      },
    };
  }

  listSelectableSamples(
    equipmentId: string,
    lpId: string,
    scope: OilAnalysisContractorScope,
  ): readonly OilSampleRow[] {
    const contractorFilter = applyContractorFilter(scope);
    return samplesForLp(equipmentId.trim(), lpId.trim(), contractorFilter);
  }
}

export const sampleReportService = new SampleReportService();
