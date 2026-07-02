// apps/owner-center/src/modules/oil-analysis/report-export.ts
// CSV and JSON export for Oil Analysis reports (Sprint 08).

import type { OilReportOutput } from './report.service';

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: readonly Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function reportToFlatRows(output: OilReportOutput): readonly Record<string, unknown>[] {
  const { report } = output;

  switch (report.kind) {
    case 'sample-summary':
      return [
        { metric: 'sampleCount', value: report.sampleCount },
        ...report.byEquipment.map((r) => ({ group: 'equipment', key: r.key, count: r.count })),
        ...report.byArea.map((r) => ({ group: 'area', key: r.key, count: r.count })),
        ...report.byContractor.map((r) => ({ group: 'contractor', key: r.key, count: r.count })),
        ...report.byStatus.map((r) => ({ group: 'status', key: r.key, count: r.count })),
        ...report.byCondition.map((r) => ({ group: 'condition', key: r.key, count: r.count })),
      ];
    case 'critical-samples':
      return report.rows.map((r) => ({ ...r }));
    case 'pending-review':
      return report.rows.map((r) => ({ ...r }));
    case 'laboratory-results':
      return report.rows.map((r) => ({ ...r }));
    case 'oil-health':
      return report.rows.map((r) => ({ ...r }));
    default:
      return [];
  }
}

function buildFilename(output: OilReportOutput, extension: string): string {
  const date = output.generatedAt.slice(0, 10);
  return `oil-analysis-${output.filters.reportType}-${date}.${extension}`;
}

export function exportReportCsv(output: OilReportOutput): void {
  const rows = reportToFlatRows(output);
  const csv = rowsToCsv(rows);
  triggerDownload(buildFilename(output, 'csv'), csv, 'text/csv;charset=utf-8');
}

export function exportReportJson(output: OilReportOutput): void {
  const json = JSON.stringify(output, null, 2);
  triggerDownload(buildFilename(output, 'json'), json, 'application/json;charset=utf-8');
}
