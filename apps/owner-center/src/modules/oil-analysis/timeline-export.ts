// apps/owner-center/src/modules/oil-analysis/timeline-export.ts
// OA-007 Timeline PDF export via browser print.

import type { OilAnalysisTimelineView } from './timeline.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

const COPY = {
  title: { en: 'Oil Analysis Timeline', ar: 'الجدول الزمني لتحليل الزيت' },
  equipment: { en: 'Equipment', ar: 'المعدة' },
  equipmentId: { en: 'Equipment ID', ar: 'معرّف المعدة' },
  lpId: { en: 'LP ID', ar: 'معرّف نقطة التشحيم' },
  samplingFreq: { en: 'Sampling Frequency', ar: 'فترة أخذ العينات' },
  oilChangeFreq: { en: 'Oil Change Frequency', ar: 'فترة تغيير الزيت' },
  status: { en: 'Current Status', ar: 'الحالة الحالية' },
  lastSample: { en: 'Last Sample', ar: 'آخر عينة' },
  nextSample: { en: 'Next Sample', ar: 'العينة القادمة' },
  lastOilChange: { en: 'Last Oil Change', ar: 'آخر تغيير زيت' },
  nextOilChange: { en: 'Next Oil Change', ar: 'تغيير الزيت القادم' },
  daysRemaining: { en: 'Days Remaining', ar: 'الأيام المتبقية' },
  events: { en: 'Timeline Events', ar: 'أحداث الجدول الزمني' },
  date: { en: 'Date', ar: 'التاريخ' },
  event: { en: 'Event', ar: 'الحدث' },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPrintHtml(view: OilAnalysisTimelineView, locale: string): string {
  const l = (bundle: L10n<string>) => t(bundle, locale);
  const { header, summary, events } = view;

  const eventRows = events
    .map(
      (event) => `
        <tr>
          <td>${escapeHtml(formatDate(event.isoDate, locale))}</td>
          <td>${escapeHtml(event.label)}</td>
          <td>${escapeHtml(event.statusLabel)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(l(COPY.title))}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .meta dt { font-size: 0.7rem; text-transform: uppercase; color: #666; }
    .meta dd { margin: 0; font-weight: 600; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 16px 0; }
    .summary div { border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
    .summary span { display: block; font-size: 0.7rem; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: start; font-size: 0.85rem; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>${escapeHtml(l(COPY.title))}</h1>
  <p><strong>${escapeHtml(header.equipmentName)}</strong> · ${escapeHtml(header.lpId)}</p>
  <dl class="meta">
    <div><dt>${escapeHtml(l(COPY.equipmentId))}</dt><dd>${escapeHtml(header.equipmentId)}</dd></div>
    <div><dt>${escapeHtml(l(COPY.lpId))}</dt><dd>${escapeHtml(header.lpId)}</dd></div>
    <div><dt>${escapeHtml(l(COPY.samplingFreq))}</dt><dd>${escapeHtml(header.samplingFrequency)}</dd></div>
    <div><dt>${escapeHtml(l(COPY.oilChangeFreq))}</dt><dd>${escapeHtml(header.oilChangeFrequency)}</dd></div>
    <div><dt>${escapeHtml(l(COPY.status))}</dt><dd>${escapeHtml(header.currentStatus)}</dd></div>
  </dl>
  <div class="summary">
    <div><span>${escapeHtml(l(COPY.lastSample))}</span>${escapeHtml(formatDate(summary.lastSampleDate, locale))}</div>
    <div><span>${escapeHtml(l(COPY.nextSample))}</span>${escapeHtml(formatDate(summary.nextSampleDate, locale))}</div>
    <div><span>${escapeHtml(l(COPY.lastOilChange))}</span>${escapeHtml(formatDate(summary.lastOilChangeDate, locale))}</div>
    <div><span>${escapeHtml(l(COPY.nextOilChange))}</span>${escapeHtml(formatDate(summary.nextOilChangeDate, locale))}</div>
    <div><span>${escapeHtml(l(COPY.daysRemaining))}</span>${summary.daysRemaining ?? '—'}</div>
  </div>
  <h2>${escapeHtml(l(COPY.events))}</h2>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(l(COPY.date))}</th>
        <th>${escapeHtml(l(COPY.event))}</th>
        <th>${escapeHtml(l(COPY.status))}</th>
      </tr>
    </thead>
    <tbody>${eventRows}</tbody>
  </table>
</body>
</html>`;
}

/** Opens a print dialog with a timeline summary suitable for PDF save. */
export function exportTimelinePdf(view: OilAnalysisTimelineView, locale: string): void {
  const html = buildPrintHtml(view, locale);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
