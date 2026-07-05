// apps/owner-center/src/modules/oil-analysis/pdf-extraction.adapter.ts
// Placeholder PDF/OCR extraction adapter — no real OCR until backend API exists.
// Mobil reports: extracts latest sample column only; older columns are trend snapshot.

import { oilAnalysisSettingsService } from './settings.service';
import type { LabCellColor } from './add-sample.types';

export interface PdfExtractionRequest {
  readonly file: File;
  readonly contractorId: string;
}

export interface PdfExtractionResult {
  readonly labSampleId: string;
  readonly equipmentId: string;
  readonly sampledAt: string;
  readonly lubricant: string;
  readonly reportStatus: 'normal' | 'caution' | 'alert';
  readonly contaminationRating: string;
  readonly equipmentRating: string;
  readonly lubricantRating: string;
  readonly ironPpm: number | null;
  readonly copperPpm: number | null;
  readonly siliconPpm: number | null;
  readonly pqIndex: number | null;
  readonly viscosity100c: number | null;
  readonly waterPercent: number | null;
  readonly sampleAnalysis: string;
  readonly alertType: string;
  readonly labParameters: readonly {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly unit: string;
    readonly cellColor: LabCellColor;
  }[];
  readonly ocrConfidence: number;
  /** Number of older Mobil trend columns ignored (0–4). */
  readonly trendColumnsIgnored: number;
  readonly reportPattern: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickFrom<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length] as T;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function deriveReportPattern(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').trim();
  const mobil = /mobil/i.test(base);
  const shell = /shell/i.test(base);
  if (mobil) return 'mobil';
  if (shell) return 'shell';
  const prefix = base.split(/[-_\s]/)[0]?.toLowerCase() ?? 'generic';
  return prefix.slice(0, 24) || 'generic';
}

function cellColorForRating(rating: string): LabCellColor {
  const level = rating.trim().toLowerCase();
  if (level === 'alert' || level === 'critical') return 'alert';
  if (level === 'caution' || level === 'warning') return 'caution';
  if (level === 'normal') return 'normal';
  return 'unknown';
}

/**
 * Simulates async PDF extraction. Real implementation will call Apps Script / OCR API.
 * Always imports the latest sample column only (Mobil: last of 5 trend columns).
 */
export async function extractLatestSampleFromPdf(
  request: PdfExtractionRequest,
): Promise<PdfExtractionResult> {
  const settings = oilAnalysisSettingsService.getSettings();
  const threshold = settings.pdfImport.ocrConfidenceThreshold;

  await new Promise((resolve) => {
    setTimeout(resolve, 400 + (hashString(request.file.name) % 300));
  });

  const seed = hashString(`${request.file.name}-${request.file.size}`);
  const reportPattern = deriveReportPattern(request.file.name);
  const isMobil = reportPattern === 'mobil';
  const trendColumnsIgnored = isMobil ? 4 : 0;

  const equipmentIds = ['EQ-1001', 'EQ-1002', 'EQ-2001', 'EQ-3005', 'EQ-4010'];
  const equipmentId = pickFrom(equipmentIds, seed);
  const labSampleId = `LAB-${isoDaysAgo(seed % 30).replace(/-/g, '')}-${String(1000 + (seed % 9000))}`;
  const sampledAt = isoDaysAgo(seed % 14);

  const reportStatuses = ['normal', 'caution', 'alert'] as const;
  const reportStatus = pickFrom(reportStatuses, seed >> 2);

  const contaminationRating = reportStatus === 'alert' ? 'Alert' : reportStatus === 'caution' ? 'Caution' : 'Normal';
  const equipmentRating = reportStatus === 'alert' ? 'Critical' : reportStatus === 'caution' ? 'Caution' : 'Normal';
  const lubricantRating = contaminationRating;

  const ironPpm = 5 + (seed % 80);
  const copperPpm = 2 + (seed % 25);
  const siliconPpm = 1 + (seed % 15);
  const pqIndex = 10 + (seed % 40);
  const viscosity100c = 68 + (seed % 8);
  const waterPercent = (seed % 5) / 10;

  const lubricants = ['Mobil SHC 624', 'Shell Tellus S2 V 46', 'Castrol Alpha SP 320'];
  const lubricant = pickFrom(lubricants, seed >> 4);

  const ocrConfidence = Math.min(
    0.99,
    Math.max(0.55, threshold - 0.05 + (seed % 20) / 100),
  );

  const labParameters = [
    { id: 'iron', label: 'Iron', value: String(ironPpm), unit: 'ppm', cellColor: cellColorForRating(equipmentRating) },
    { id: 'copper', label: 'Copper', value: String(copperPpm), unit: 'ppm', cellColor: 'normal' as LabCellColor },
    { id: 'silicon', label: 'Silicon', value: String(siliconPpm), unit: 'ppm', cellColor: 'normal' as LabCellColor },
    { id: 'pq', label: 'PQ Index', value: String(pqIndex), unit: '', cellColor: cellColorForRating(contaminationRating) },
    { id: 'viscosity', label: 'Viscosity @100°C', value: String(viscosity100c), unit: 'cSt', cellColor: 'normal' as LabCellColor },
    { id: 'water', label: 'Water', value: String(waterPercent), unit: '%', cellColor: cellColorForRating(lubricantRating) },
  ];

  return {
    labSampleId,
    equipmentId,
    sampledAt,
    lubricant,
    reportStatus,
    contaminationRating,
    equipmentRating,
    lubricantRating,
    ironPpm,
    copperPpm,
    siliconPpm,
    pqIndex,
    viscosity100c,
    waterPercent,
    sampleAnalysis: isMobil
      ? 'Latest column extracted; 4 prior Mobil trend columns preserved for display only.'
      : 'Latest sample column extracted from PDF.',
    alertType: reportStatus === 'alert' ? 'Wear metals elevated' : '',
    labParameters,
    ocrConfidence,
    trendColumnsIgnored,
    reportPattern,
  };
}
