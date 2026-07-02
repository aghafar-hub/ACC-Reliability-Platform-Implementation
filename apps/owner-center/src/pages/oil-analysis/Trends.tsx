// apps/owner-center/src/pages/oil-analysis/Trends.tsx
// Oil Analysis — Trend Analysis (Sprint 07).

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { StatusChip } from '../../components/StatusChip';
import type { ChipStatus } from '../../components/StatusChip';
import { SummaryCard } from '../../components/SummaryCard';
import {
  OIL_TREND_PARAMETERS,
  analyzeOilParameterTrend,
  listTrendableEquipmentIds,
  listTrendableLpIds,
  listTrendableSamples,
  listOilChangeEvents,
  generateEngineeringInsights,
  buildTrendTimeline,
} from '../../modules/oil-analysis/trend.service';
import type { OilTrendParameterId } from '../../modules/oil-analysis/trend.service';
import type { TrendTimeRange, TrendDirection } from '../../modules/trend-engine';
import {
  isTrendEngineEnabled,
  getEnabledTrendParameters,
  SETTINGS_GUARD_COPY,
} from '../../modules/oil-analysis/settings-guards';
import { SettingsDisabledPanel } from './SettingsDisabledPanel';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

const COPY = {
  title:       { en: 'Trend Analysis',           ar: 'تحليل الاتجاهات' },
  desc:        { en: 'Visualize approved laboratory parameter history for equipment and lubrication points.', ar: 'تصوّر سجل معاملات المختبر المعتمدة للمعدات ونقاط التشحيم.' },
  liveData:    { en: 'Approved results only',    ar: 'النتائج المعتمدة فقط' },
  selEquip:    { en: 'Equipment',                ar: 'المعدة' },
  selLp:       { en: 'Lubrication Point',        ar: 'نقطة التشحيم' },
  selSample:   { en: 'Sample',                   ar: 'العينة' },
  selParam:    { en: 'Parameter',                ar: 'المعامل' },
  selRange:    { en: 'Time Range',               ar: 'النطاق الزمني' },
  allLps:      { en: 'All LPs',                  ar: 'جميع النقاط' },
  allSamples:  { en: 'All samples',              ar: 'جميع العينات' },
  noEquip:     { en: 'No equipment with approved samples.', ar: 'لا توجد معدات بعينات معتمدة.' },
  noData:      { en: 'No trend data for this selection.', ar: 'لا توجد بيانات اتجاه لهذا الاختيار.' },
  secChart:    { en: 'Parameter Trend',          ar: 'اتجاه المعامل' },
  secSummary:  { en: 'Trend Summary',            ar: 'ملخص الاتجاه' },
  secTimeline: { en: 'Sample & Oil Change Timeline', ar: 'الجدول الزمني للعينات وتغيير الزيت' },
  secInsights: { en: 'Engineering Insight',      ar: 'رؤية هندسية' },
  sumCurrent:  { en: 'Current Value',            ar: 'القيمة الحالية' },
  sumCondition:{ en: 'Current Condition',        ar: 'الحالة الحالية' },
  sumDirection:{ en: 'Trend Direction',          ar: 'اتجاه الاتجاه' },
  sumHigh:     { en: 'Highest Reading',          ar: 'أعلى قراءة' },
  sumLow:      { en: 'Lowest Reading',           ar: 'أدنى قراءة' },
  sumAvg:      { en: 'Average',                  ar: 'المتوسط' },
  sumLast:     { en: 'Last Sample Date',         ar: 'تاريخ آخر عينة' },
  sumCount:    { en: 'Number of Samples',        ar: 'عدد العينات' },
  tlSample:    { en: 'Sample',                   ar: 'عينة' },
  tlOilChange: { en: 'Oil Change',               ar: 'تغيير زيت' },
  chartMa:     { en: 'Moving avg.',              ar: 'المتوسط المتحرك' },
  range30:     { en: '30 Days',                  ar: '30 يوماً' },
  range90:     { en: '90 Days',                  ar: '90 يوماً' },
  range180:    { en: '180 Days',                 ar: '180 يوماً' },
  range1y:     { en: '1 Year',                   ar: 'سنة واحدة' },
  rangeAll:    { en: 'All',                      ar: 'الكل' },
  dirStable:   { en: 'Stable',                   ar: 'مستقر' },
  dirImproving:{ en: 'Improving',                ar: 'يتحسن' },
  dirRising:   { en: 'Rising',                   ar: 'مرتفع' },
  dirRapid:    { en: 'Rapidly Rising',           ar: 'يرتفع بسرعة' },
  dirSudden:   { en: 'Sudden Change',            ar: 'تغير مفاجئ' },
  condNormal:  { en: 'Normal',                   ar: 'طبيعي' },
  condMonitor: { en: 'Monitor',                  ar: 'مراقبة' },
  condCaution: { en: 'Caution',                  ar: 'تحذير' },
  condCritical:{ en: 'Critical',                 ar: 'حرج' },
  condUnknown: { en: 'Unknown',                  ar: 'غير معروف' },
} as const;

const TIME_RANGES: readonly { id: TrendTimeRange; label: L10n<string> }[] = [
  { id: '30d',  label: COPY.range30 },
  { id: '90d',  label: COPY.range90 },
  { id: '180d', label: COPY.range180 },
  { id: '1y',   label: COPY.range1y },
  { id: 'all',  label: COPY.rangeAll },
];

const DIRECTION_LABELS: Record<TrendDirection, L10n<string>> = {
  stable:          COPY.dirStable,
  improving:       COPY.dirImproving,
  rising:          COPY.dirRising,
  'rapidly-rising':COPY.dirRapid,
  'sudden-change': COPY.dirSudden,
};

function directionChip(direction: TrendDirection): ChipStatus {
  switch (direction) {
    case 'sudden-change':
    case 'rapidly-rising':
      return 'critical';
    case 'rising':
      return 'warning';
    case 'improving':
      return 'operational';
    default:
      return 'maintenance';
  }
}

function conditionLabel(
  cond: 'normal' | 'monitor' | 'caution' | 'critical' | 'unknown',
  locale: string,
): string {
  const map: Record<typeof cond, L10n<string>> = {
    normal:   COPY.condNormal,
    monitor:  COPY.condMonitor,
    caution:  COPY.condCaution,
    critical: COPY.condCritical,
    unknown:  COPY.condUnknown,
  };
  return t(map[cond], locale);
}

function conditionChip(cond: 'normal' | 'monitor' | 'caution' | 'critical' | 'unknown'): ChipStatus {
  switch (cond) {
    case 'critical': return 'critical';
    case 'caution':  return 'warning';
    case 'monitor':  return 'maintenance';
    case 'normal':   return 'operational';
    default:         return 'maintenance';
  }
}

// ── SVG trend chart ───────────────────────────────────────────────────────────

interface TrendChartProps {
  readonly points: readonly { at: string; value: number; sourceId?: string }[];
  readonly movingAverage: readonly { at: string; value: number }[];
  readonly oilChanges: readonly { at: string }[];
  readonly highlightId?: string | null;
  readonly unit: string;
}

function TrendChart({
  points,
  movingAverage,
  oilChanges,
  highlightId,
  unit,
}: TrendChartProps): React.ReactElement {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 32, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (points.length === 0) {
    return (
      <div className="oa-trend-chart oa-trend-chart--empty">
        <span className="oa-trend-chart__empty-label">—</span>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.08;
  const yMax = maxV + span * 0.08;

  const xAt = (index: number) => pad.left + (index / Math.max(points.length - 1, 1)) * innerW;
  const yAt = (value: number) => pad.top + innerH - ((value - yMin) / (yMax - yMin)) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(' ');

  const maPath = movingAverage.length > 1
    ? movingAverage
        .map((p, i) => {
          const idx = points.findIndex((pt) => pt.at === p.at);
          const x = idx >= 0 ? xAt(idx) : xAt(i);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yAt(p.value).toFixed(1)}`;
        })
        .join(' ')
    : '';

  const oilChangeX = (date: string): number | null => {
    const idx = points.findIndex((p) => p.at >= date);
    if (idx < 0) return points.length > 1 ? xAt(points.length - 1) : null;
    if (idx === 0) return xAt(0);
    const prev = points[idx - 1]!;
    const next = points[idx]!;
    const ratio = (new Date(date).getTime() - new Date(prev.at).getTime()) /
      Math.max(new Date(next.at).getTime() - new Date(prev.at).getTime(), 1);
    return xAt(idx - 1) + ratio * (xAt(idx) - xAt(idx - 1));
  };

  return (
    <div className="oa-trend-chart">
      <svg
        className="oa-trend-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Parameter trend chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = pad.top + innerH * (1 - frac);
          const val = yMin + (yMax - yMin) * frac;
          return (
            <g key={frac}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                className="oa-trend-chart__grid"
              />
              <text x={pad.left - 6} y={y + 4} className="oa-trend-chart__axis" textAnchor="end">
                {formatNumber(val, 1)}
              </text>
            </g>
          );
        })}

        {oilChanges.map((oc) => {
          const x = oilChangeX(oc.at);
          if (x === null) return null;
          return (
            <g key={`oc-${oc.at}`}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={height - pad.bottom}
                className="oa-trend-chart__oil-change"
              />
              <text x={x} y={pad.top - 4} className="oa-trend-chart__oil-label" textAnchor="middle">
                OC
              </text>
            </g>
          );
        })}

        {maPath ? (
          <path d={maPath} className="oa-trend-chart__ma" fill="none" />
        ) : null}

        <path d={linePath} className="oa-trend-chart__line" fill="none" />

        {points.map((p, i) => {
          const highlighted = highlightId && p.sourceId === highlightId;
          return (
            <circle
              key={`${p.at}-${i}`}
              cx={xAt(i)}
              cy={yAt(p.value)}
              r={highlighted ? 6 : 4}
              className={highlighted ? 'oa-trend-chart__dot--highlight' : 'oa-trend-chart__dot'}
            />
          );
        })}

        {points.length > 0 && (
          <text x={width - pad.right} y={height - 8} className="oa-trend-chart__unit" textAnchor="end">
            {unit}
          </text>
        )}
      </svg>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Trends(): React.ReactElement {
  if (!isTrendEngineEnabled()) {
    return (
      <SettingsDisabledPanel
        title={COPY.title}
        desc={COPY.desc}
        message={SETTINGS_GUARD_COPY.trendEngineDisabled}
        badge={{ en: 'Disabled', ar: 'معطّل' }}
      />
    );
  }

  return <TrendsContent />;
}

function TrendsContent(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (bundle: L10n<string>) => t(bundle, locale);

  const equipmentIds = useMemo(() => listTrendableEquipmentIds(), []);

  const enabledParameters = useMemo(() => getEnabledTrendParameters(), []);

  const [equipmentId, setEquipmentId] = useState(() => equipmentIds[0] ?? '');
  const [lpId, setLpId] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [parameterId, setParameterId] = useState<OilTrendParameterId>(
    () => enabledParameters[0]?.id ?? 'iron',
  );
  const [timeRange, setTimeRange] = useState<TrendTimeRange>('1y');

  const activeParameterId = useMemo(() => {
    if (enabledParameters.some((p) => p.id === parameterId)) return parameterId;
    return enabledParameters[0]?.id ?? parameterId;
  }, [enabledParameters, parameterId]);

  const lpIds = useMemo(
    () => (equipmentId ? listTrendableLpIds(equipmentId) : []),
    [equipmentId],
  );

  const samples = useMemo(
    () => (equipmentId ? listTrendableSamples(equipmentId, lpId || null) : []),
    [equipmentId, lpId],
  );

  const paramDef = enabledParameters.find((p) => p.id === activeParameterId)
    ?? OIL_TREND_PARAMETERS.find((p) => p.id === activeParameterId)!;

  const analysis = useMemo(() => {
    if (!equipmentId || enabledParameters.length === 0) return null;
    return analyzeOilParameterTrend({
      equipmentId,
      lubricationPointId: lpId || null,
      parameterId: activeParameterId,
      timeRange,
      highlightSampleId: sampleId || null,
    });
  }, [equipmentId, lpId, activeParameterId, timeRange, sampleId, enabledParameters.length]);

  const oilChanges = useMemo(
    () => (equipmentId ? listOilChangeEvents(equipmentId, lpId || null) : []),
    [equipmentId, lpId],
  );

  const insights = useMemo(() => {
    if (!analysis || !equipmentId) return [];
    return generateEngineeringInsights(
      { equipmentId, lubricationPointId: lpId || null, parameterId: activeParameterId, timeRange },
      analysis,
      locale,
    );
  }, [analysis, equipmentId, lpId, activeParameterId, timeRange, locale]);

  const timeline = useMemo(
    () => (analysis ? buildTrendTimeline(analysis, oilChanges) : []),
    [analysis, oilChanges],
  );

  const summary = analysis?.summary;

  return (
    <div className="ur-page oa-trend-page">
      <header className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.title)}</h1>
          <p className="ur-page__desc">{l(COPY.desc)}</p>
        </div>
        <StatusChip status="operational" label={l(COPY.liveData)} />
      </header>

      <div className="oa-trend-toolbar ol-explorer-toolbar">
        <div className="ol-explorer-filters">
          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.selEquip)}</span>
            <select
              className="ol-explorer-select"
              value={equipmentId}
              onChange={(e) => {
                setEquipmentId(e.target.value);
                setLpId('');
                setSampleId('');
              }}
            >
              {equipmentIds.length === 0 ? (
                <option value="">{l(COPY.noEquip)}</option>
              ) : (
                equipmentIds.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))
              )}
            </select>
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.selLp)}</span>
            <select
              className="ol-explorer-select"
              value={lpId}
              onChange={(e) => {
                setLpId(e.target.value);
                setSampleId('');
              }}
              disabled={!equipmentId}
            >
              <option value="">{l(COPY.allLps)}</option>
              {lpIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.selSample)}</span>
            <select
              className="ol-explorer-select"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              disabled={!equipmentId}
            >
              <option value="">{l(COPY.allSamples)}</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sampleId} · {formatDate(s.sampledAt)}
                </option>
              ))}
            </select>
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.selParam)}</span>
            <select
              className="ol-explorer-select"
              value={activeParameterId}
              onChange={(e) => setParameterId(e.target.value as OilTrendParameterId)}
              disabled={enabledParameters.length === 0}
            >
              {enabledParameters.map((p) => (
                <option key={p.id} value={p.id}>
                  {locale === 'ar' ? p.label.ar : p.label.en}
                </option>
              ))}
            </select>
          </label>

          <label className="oa-trend-field">
            <span className="oa-trend-field__label">{l(COPY.selRange)}</span>
            <select
              className="ol-explorer-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TrendTimeRange)}
            >
              {TIME_RANGES.map((r) => (
                <option key={r.id} value={r.id}>{l(r.label)}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!equipmentId || !analysis || analysis.points.length === 0 ? (
        <div className="db-panel">
          <div className="db-panel__body">
            <p className="db-panel__empty">{l(COPY.noData)}</p>
          </div>
        </div>
      ) : (
        <>
          <section className="dashboard-section">
            <h2 className="dashboard-section__title">{l(COPY.secChart)}</h2>
            <div className="db-panel">
              <div className="db-panel__body">
                <TrendChart
                  points={analysis.points}
                  movingAverage={analysis.summary.movingAverage}
                  oilChanges={oilChanges}
                  highlightId={sampleId || null}
                  unit={paramDef.unit}
                />
                <div className="oa-trend-legend">
                  <span className="oa-trend-legend__item">
                    <span className="oa-trend-legend__swatch oa-trend-legend__swatch--line" />
                    {locale === 'ar' ? paramDef.label.ar : paramDef.label.en}
                  </span>
                  <span className="oa-trend-legend__item">
                    <span className="oa-trend-legend__swatch oa-trend-legend__swatch--ma" />
                    {l(COPY.chartMa)}
                  </span>
                  <span className="oa-trend-legend__item">
                    <span className="oa-trend-legend__swatch oa-trend-legend__swatch--oc" />
                    {l(COPY.tlOilChange)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <h2 className="dashboard-section__title">{l(COPY.secSummary)}</h2>
            <div className="oa-trend-summary">
              <div className="oa-trend-summary__chips">
                <div className="oa-trend-chip-row">
                  <span className="oa-trend-chip-row__label">{l(COPY.sumCondition)}</span>
                  <StatusChip
                    status={conditionChip(summary?.currentCondition ?? 'unknown')}
                    label={conditionLabel(summary?.currentCondition ?? 'unknown', locale)}
                  />
                </div>
                <div className="oa-trend-chip-row">
                  <span className="oa-trend-chip-row__label">{l(COPY.sumDirection)}</span>
                  <StatusChip
                    status={directionChip(summary?.direction ?? 'stable')}
                    label={l(DIRECTION_LABELS[summary?.direction ?? 'stable'])}
                  />
                </div>
              </div>
              <div className="ur-summary-grid">
                <SummaryCard
                  value={formatNumber(summary?.currentValue ?? null)}
                  label={l(COPY.sumCurrent)}
                  modifier="info"
                />
                <SummaryCard
                  value={formatNumber(summary?.highest ?? null)}
                  label={l(COPY.sumHigh)}
                  modifier="caution"
                />
                <SummaryCard
                  value={formatNumber(summary?.lowest ?? null)}
                  label={l(COPY.sumLow)}
                  modifier="neutral"
                />
                <SummaryCard
                  value={formatNumber(summary?.average ?? null)}
                  label={l(COPY.sumAvg)}
                  modifier="neutral"
                />
                <SummaryCard
                  value={summary?.lastSampleDate ? formatDate(summary.lastSampleDate) : '—'}
                  label={l(COPY.sumLast)}
                  modifier="info"
                />
                <SummaryCard
                  value={String(summary?.sampleCount ?? 0)}
                  label={l(COPY.sumCount)}
                  modifier="neutral"
                />
              </div>
            </div>
          </section>

          <div className="db-two-col">
            <section className="dashboard-section">
              <h2 className="dashboard-section__title">{l(COPY.secTimeline)}</h2>
              <div className="db-panel">
                <div className="db-panel__body">
                  <ul className="oa-trend-timeline">
                    {timeline.map((item, idx) => (
                      <li
                        key={`${item.kind}-${item.at}-${idx}`}
                        className={`oa-trend-timeline__item oa-trend-timeline__item--${item.kind}`}
                      >
                        <span className="oa-trend-timeline__marker" aria-hidden="true">
                          {item.kind === 'oil-change' ? '↓' : '●'}
                        </span>
                        <div className="oa-trend-timeline__content">
                          <span className="oa-trend-timeline__kind">
                            {item.kind === 'oil-change' ? l(COPY.tlOilChange) : l(COPY.tlSample)}
                          </span>
                          <span className="oa-trend-timeline__date">{formatDate(item.at)}</span>
                          {item.value !== undefined && (
                            <span className="oa-trend-timeline__value">
                              {formatNumber(item.value)} {paramDef.unit}
                            </span>
                          )}
                          {item.kind === 'oil-change' && (
                            <span className="oa-trend-timeline__detail">{item.label}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="dashboard-section">
              <h2 className="dashboard-section__title">{l(COPY.secInsights)}</h2>
              <div className="db-panel">
                <div className="db-panel__body">
                  {insights.length === 0 ? (
                    <p className="db-panel__empty">—</p>
                  ) : (
                    <ul className="ol-db-alerts">
                      {insights.map((insight) => (
                        <li
                          key={insight.id}
                          className={`ol-db-alerts__item ol-db-alerts__item--${
                            insight.severity === 'alert'
                              ? 'critical'
                              : insight.severity === 'watch'
                                ? 'warning'
                                : 'info'
                          }`}
                        >
                          <span className="ol-db-alerts__icon" aria-hidden="true">ℹ</span>
                          <span>{insight.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
