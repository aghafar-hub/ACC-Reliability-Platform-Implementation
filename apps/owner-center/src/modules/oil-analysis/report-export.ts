// apps/owner-center/src/modules/oil-analysis/report-export.ts
// OA-008 — professional PDF (print) and Excel export for Oil Analysis reports.

import type { OilReportOutput } from './report.service';
import { findReportTemplate } from './report-catalog';
import { oilAnalysisSettingsService } from './settings.service';

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatGeneratedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === 'ar' ? 'ar-SA' : undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildFilename(output: OilReportOutput, extension: string): string {
  const date = output.generatedAt.slice(0, 10);
  return `oil-analysis-${output.filters.reportType}-${date}.${extension}`;
}

function filterSummaryText(output: OilReportOutput): string {
  const parts: string[] = [];
  const f = output.filters;
  if (f.dateFrom) parts.push(`From ${f.dateFrom}`);
  if (f.dateTo) parts.push(`To ${f.dateTo}`);
  if (f.lpIds && f.lpIds.length > 0) {
    parts.push(f.lpIds.length === 1 ? `LP ${f.lpIds[0]}` : `${f.lpIds.length} LPs`);
  }
  if (f.equipmentId) parts.push(`Equipment ${f.equipmentId}`);
  if (f.area) parts.push(`Area ${f.area}`);
  if (f.contractor) parts.push(`Contractor ${f.contractor}`);
  if (f.oilType) parts.push(`Oil ${f.oilType}`);
  if (f.reportStatus) parts.push(`Report status ${f.reportStatus}`);
  if (f.equipmentStatus) parts.push(`Equipment status ${f.equipmentStatus}`);
  if (f.sampleId) parts.push(`Sample ${f.sampleId}`);
  return parts.length > 0 ? parts.join(' · ') : 'All records in scope';
}

function renderTableHtml(output: OilReportOutput): string {
  const { report } = output;
  if (report.tableColumns.length === 0) return '';

  const header = report.tableColumns
    .map((col) => `<th>${escapeHtml(col.label)}</th>`)
    .join('');
  const body = report.tableRows
    .map((row) => {
      const cells = report.tableColumns
        .map((col) => {
          const val = row[col.id];
          return `<td>${escapeHtml(val === null || val === undefined ? '—' : String(val))}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table class="data"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderBreakdownsHtml(output: OilReportOutput): string {
  return output.report.breakdowns
    .filter((b) => b.rows.length > 0)
    .map((breakdown) => {
      const rows = breakdown.rows
        .map((r) => `<tr><td>${escapeHtml(r.key)}</td><td>${r.count}</td></tr>`)
        .join('');
      return `<section class="section"><h2>${escapeHtml(breakdown.title)}</h2><table class="data"><thead><tr><th>Group</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join('');
}

function renderChartsHtml(output: OilReportOutput): string {
  const settings = oilAnalysisSettingsService.getSettings();
  if (!settings.reportSettings.enableCharts) return '';

  return output.report.charts
    .filter((chart) => chart.slices.some((s) => s.value > 0))
    .map((chart) => {
      const max = Math.max(...chart.slices.map((s) => s.value), 1);
      const bars = chart.slices
        .map((slice) => {
          const width = Math.round((slice.value / max) * 100);
          const color = slice.color ?? '#2563eb';
          return `<div class="bar-row"><span class="bar-label">${escapeHtml(slice.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${color}"></div></div><span class="bar-value">${slice.value}</span></div>`;
        })
        .join('');
      return `<section class="section"><h2>${escapeHtml(chart.title)}</h2><div class="bars">${bars}</div></section>`;
    })
    .join('');
}

function renderKpisHtml(output: OilReportOutput): string {
  if (output.kpis.length === 0) return '';
  const items = output.kpis
    .map((kpi) => `<div class="kpi"><span>${escapeHtml(kpi.label)}</span><strong>${kpi.value}</strong></div>`)
    .join('');
  return `<div class="kpis">${items}</div>`;
}

function buildPrintHtml(output: OilReportOutput, locale: string): string {
  const template = findReportTemplate(output.filters.reportType);
  const title = template
    ? locale === 'ar'
      ? template.labelAr
      : template.labelEn
    : output.report.title;
  const settings = oilAnalysisSettingsService.getSettings();
  const showFooter = settings.reportSettings.enableFooter;
  const showHeader = settings.reportSettings.enableCompanyHeader;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 18mm 14mm; }
    body { font-family: "Segoe UI", system-ui, sans-serif; margin: 0; color: #111827; font-size: 11pt; }
    .brand { border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
    .brand h1 { margin: 0; font-size: 20pt; color: #1e3a5f; }
    .brand p { margin: 4px 0 0; color: #4b5563; font-size: 10pt; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
    .meta div { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; }
    .meta dt { font-size: 8pt; text-transform: uppercase; color: #6b7280; margin: 0; }
    .meta dd { margin: 2px 0 0; font-weight: 600; font-size: 10pt; }
    .filters { font-size: 9pt; color: #4b5563; margin-bottom: 16px; padding: 8px; background: #f9fafb; border-radius: 4px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; text-align: center; }
    .kpi span { display: block; font-size: 8pt; color: #6b7280; text-transform: uppercase; }
    .kpi strong { font-size: 14pt; color: #1e3a5f; }
    .section { margin: 20px 0; page-break-inside: avoid; }
    .section h2 { font-size: 12pt; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin: 0 0 8px; color: #1e3a5f; }
    table.data { width: 100%; border-collapse: collapse; font-size: 9pt; }
    table.data th, table.data td { border: 1px solid #d1d5db; padding: 5px 7px; text-align: start; }
    table.data th { background: #f3f4f6; font-weight: 600; }
    table.data tr:nth-child(even) td { background: #fafafa; }
    .bars { display: flex; flex-direction: column; gap: 6px; }
    .bar-row { display: grid; grid-template-columns: 100px 1fr 40px; gap: 8px; align-items: center; font-size: 9pt; }
    .bar-track { height: 10px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #d1d5db; text-align: center; font-size: 8pt; color: #6b7280; }
    .page-num::after { content: counter(page); }
  </style>
</head>
<body>
  ${showHeader ? `<header class="brand"><h1>ACC Reliability Platform</h1><p>Oil Analysis Engineering Report</p></header>` : ''}
  <h1 style="font-size:16pt;color:#1e3a5f;margin:0 0 8px">${escapeHtml(title)}</h1>
  <dl class="meta">
    <div><dt>Reference</dt><dd>${escapeHtml(output.reference)}</dd></div>
    <div><dt>Generated</dt><dd>${escapeHtml(formatGeneratedAt(output.generatedAt, locale))}</dd></div>
    <div><dt>Report Type</dt><dd>${escapeHtml(output.filters.reportType)}</dd></div>
  </dl>
  <p class="filters"><strong>Filters:</strong> ${escapeHtml(filterSummaryText(output))}</p>
  ${renderKpisHtml(output)}
  ${renderChartsHtml(output)}
  <section class="section"><h2>Report Data</h2>${renderTableHtml(output)}</section>
  ${renderBreakdownsHtml(output)}
  ${showFooter ? `<footer class="footer">ACC Reliability Platform — Confidential Engineering Report · Page <span class="page-num"></span></footer>` : ''}
</body>
</html>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildExcelXml(output: OilReportOutput, locale: string): string {
  const template = findReportTemplate(output.filters.reportType);
  const title = template
    ? locale === 'ar'
      ? template.labelAr
      : template.labelEn
    : output.report.title;
  const { report } = output;

  const metaRows = [
    ['ACC Reliability Platform — Oil Analysis Report'],
    [title],
    ['Reference', output.reference],
    ['Generated', formatGeneratedAt(output.generatedAt, locale)],
    ['Filters', filterSummaryText(output)],
    [],
  ];

  const dataHeader = report.tableColumns.map((c) => c.label);
  const dataRows = report.tableRows.map((row) =>
    report.tableColumns.map((col) => {
      const val = row[col.id];
      return val === null || val === undefined ? '' : String(val);
    }),
  );

  const allRows = [...metaRows, dataHeader, ...dataRows];

  const rowXml = allRows
    .map((row) => {
      const cells = row
        .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Report">
    <Table>${rowXml}</Table>
  </Worksheet>
</Workbook>`;
}

/** Opens browser print dialog with professional report HTML (save as PDF). */
export function exportReportPdf(output: OilReportOutput, locale: string): void {
  const html = buildPrintHtml(output, locale);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/** Downloads SpreadsheetML workbook opened by Excel. */
export function exportReportExcel(output: OilReportOutput, locale: string): void {
  const xml = buildExcelXml(output, locale);
  triggerDownload(
    buildFilename(output, 'xls'),
    xml,
    'application/vnd.ms-excel;charset=utf-8',
  );
}
