// apps/owner-center/src/pages/oil-analysis/LabResults.tsx
// Oil Analysis — Lab Results manual entry (Sprint 03).

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { StatusChip } from '../../components/StatusChip';
import type { ChipStatus } from '../../components/StatusChip';
import {
  oilSampleService,
  hasLabResults,
  computeConditionAssessment,
} from '../../modules/oil-analysis/sample.service';
import type {
  OilSampleRow,
  OilLabResultStatus,
  OilLabResultInput,
  OilConditionLevel,
} from '../../modules/oil-analysis/sample.service';

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

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? '' : String(value);
}

const COPY = {
  title:       { en: 'Lab Results',              ar: 'نتائج المختبر' },
  desc:        { en: 'Select a sample and enter laboratory analysis results manually.', ar: 'اختر عينة وأدخل نتائج التحليل المختبري يدوياً.' },
  liveData:    { en: 'Manual entry',             ar: 'إدخال يدوي' },
  secSelect:   { en: 'Select Sample',            ar: 'اختر العينة' },
  secSummary:  { en: 'Sample Summary',         ar: 'ملخص العينة' },
  secResults:  { en: 'Analysis Results',       ar: 'نتائج التحليل' },
  secPreview:  { en: 'Condition Assessment Preview', ar: 'معاينة تقييم الحالة' },
  previewNone: { en: 'Enter result status or ratings to preview overall condition.', ar: 'أدخل حالة النتيجة أو التصنيفات لمعاينة الحالة الإجمالية.' },
  selPh:       { en: 'Choose a sample…',         ar: 'اختر عينة…' },
  noSamples:   { en: 'No samples available. Register a sample via Intake first.', ar: 'لا توجد عينات. سجّل عينة عبر الاستقبال أولاً.' },
  btnSave:     { en: 'Save Results',             ar: 'حفظ النتائج' },
  btnReset:    { en: 'Reset Form',               ar: 'إعادة تعيين' },
  success:     { en: 'Lab results saved. Sample marked as analysed.', ar: 'تم حفظ نتائج المختبر. تم وضع علامة على العينة كمحللة.' },
  fldStatus:   { en: 'Result Status *',          ar: 'حالة النتيجة *' },
  stNormal:    { en: 'Normal',                   ar: 'طبيعي' },
  stMonitor:   { en: 'Monitor',                  ar: 'مراقبة' },
  stCaution:   { en: 'Caution',                  ar: 'تحذير' },
  stCritical:  { en: 'Critical',                 ar: 'حرج' },
  fldContam:   { en: 'Contamination Rating',     ar: 'تصنيف التلوث' },
  fldEquipR:   { en: 'Equipment Rating',         ar: 'تصنيف المعدة' },
  fldLubR:     { en: 'Lubricant Rating',         ar: 'تصنيف الزيت' },
  fldPq:       { en: 'PQ Index',                 ar: 'مؤشر PQ' },
  fldVis:      { en: 'Viscosity @ 100°C',        ar: 'اللزوجة @ 100°م' },
  fldTan:      { en: 'TAN',                      ar: 'TAN' },
  fldOx:       { en: 'Oxidation',                ar: 'الأكسدة' },
  fldWater:    { en: 'Water %',                  ar: 'نسبة الماء %' },
  fldP4:       { en: 'Particles > 4µm',          ar: 'جسيمات > 4µm' },
  fldP6:       { en: 'Particles > 6µm',          ar: 'جسيمات > 6µm' },
  fldP14:      { en: 'Particles > 14µm',         ar: 'جسيمات > 14µm' },
  fldAnalysis: { en: 'Sample Analysis',          ar: 'تحليل العينة' },
  fldAlert:    { en: 'Alert Type',               ar: 'نوع التنبيه' },
  sumSample:   { en: 'Sample ID',                ar: 'معرّف العينة' },
  sumLab:      { en: 'Lab Sample ID',            ar: 'معرّف المختبر' },
  sumEquip:    { en: 'Equipment ID',             ar: 'معرّف المعدة' },
  sumLp:       { en: 'LP ID',                    ar: 'رمز النقطة' },
  sumDate:     { en: 'Sample Date',              ar: 'تاريخ العينة' },
  sumLub:      { en: 'Lubricant',                ar: 'زيت التشحيم' },
  sumArea:     { en: 'Area',                     ar: 'المنطقة' },
  sumContr:    { en: 'Contractor',               ar: 'المقاول' },
  sumLoc:      { en: 'Sampling Location',        ar: 'موقع أخذ العينة' },
  sumStatus:   { en: 'Current Status',           ar: 'الحالة الحالية' },
  none:        { en: '—',                        ar: '—' },
} as const;

const RESULT_STATUS_LABELS: Record<OilLabResultStatus, L10n<string>> = {
  normal:   COPY.stNormal,
  monitor:  COPY.stMonitor,
  caution:  COPY.stCaution,
  critical: COPY.stCritical,
};

function resultStatusChip(status: OilLabResultStatus): ChipStatus {
  switch (status) {
    case 'critical': return 'critical';
    case 'caution':  return 'warning';
    case 'monitor':  return 'maintenance';
    default:         return 'operational';
  }
}

const CONDITION_LABELS: Record<OilConditionLevel, L10n<string>> = {
  normal:   COPY.stNormal,
  monitor:  COPY.stMonitor,
  caution:  COPY.stCaution,
  critical: COPY.stCritical,
};

function conditionLevelChip(level: OilConditionLevel): ChipStatus {
  switch (level) {
    case 'critical': return 'critical';
    case 'caution':  return 'warning';
    case 'monitor':  return 'maintenance';
    default:         return 'operational';
  }
}

interface LabFormState {
  resultStatus: OilLabResultStatus | '';
  contaminationRating: string;
  equipmentRating: string;
  lubricantRating: string;
  pqIndex: string;
  viscosity100c: string;
  tan: string;
  oxidation: string;
  waterPercent: string;
  particle4: string;
  particle6: string;
  particle14: string;
  sampleAnalysis: string;
  alertType: string;
}

const EMPTY_FORM: LabFormState = {
  resultStatus: '',
  contaminationRating: '',
  equipmentRating: '',
  lubricantRating: '',
  pqIndex: '',
  viscosity100c: '',
  tan: '',
  oxidation: '',
  waterPercent: '',
  particle4: '',
  particle6: '',
  particle14: '',
  sampleAnalysis: '',
  alertType: '',
};

function formFromSample(row: OilSampleRow): LabFormState {
  return {
    resultStatus: row.resultStatus ?? '',
    contaminationRating: row.contaminationRating,
    equipmentRating: row.equipmentRating,
    lubricantRating: row.lubricantRating,
    pqIndex: formatOptionalNumber(row.pqIndex),
    viscosity100c: formatOptionalNumber(row.viscosity100c),
    tan: formatOptionalNumber(row.tan),
    oxidation: formatOptionalNumber(row.oxidation),
    waterPercent: formatOptionalNumber(row.waterPercent),
    particle4: formatOptionalNumber(row.particle4),
    particle6: formatOptionalNumber(row.particle6),
    particle14: formatOptionalNumber(row.particle14),
    sampleAnalysis: row.sampleAnalysis,
    alertType: row.alertType,
  };
}

export default function LabResults(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);

  const samples = oilSampleService.listForLabEntry();
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<LabFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [revision, setRevision] = useState(0);

  const selected = useMemo(
    () => (selectedId ? oilSampleService.findById(selectedId) : null),
    [selectedId, revision],
  );

  const previewCondition = useMemo(() => {
    if (!form.resultStatus && !form.contaminationRating.trim()
      && !form.equipmentRating.trim() && !form.lubricantRating.trim()) {
      return null;
    }
    return computeConditionAssessment({
      resultStatus: form.resultStatus ? form.resultStatus as OilLabResultStatus : null,
      contaminationRating: form.contaminationRating,
      equipmentRating: form.equipmentRating,
      lubricantRating: form.lubricantRating,
    });
  }, [form.resultStatus, form.contaminationRating, form.equipmentRating, form.lubricantRating]);

  function handleSelectSample(id: string): void {
    setSelectedId(id);
    setError(null);
    setSuccess(false);
    const row = id ? oilSampleService.findById(id) : null;
    setForm(row && hasLabResults(row) ? formFromSample(row) : EMPTY_FORM);
  }

  function updateField<K extends keyof LabFormState>(key: K, value: LabFormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(false);
  }

  function handleReset(): void {
    setForm(selected && hasLabResults(selected) ? formFromSample(selected) : EMPTY_FORM);
    setError(null);
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!selectedId) {
      setError('Sample is required.');
      return;
    }

    const input: OilLabResultInput = {
      resultStatus: form.resultStatus as OilLabResultStatus,
      contaminationRating: form.contaminationRating,
      equipmentRating: form.equipmentRating,
      lubricantRating: form.lubricantRating,
      pqIndex: parseOptionalNumber(form.pqIndex),
      viscosity100c: parseOptionalNumber(form.viscosity100c),
      tan: parseOptionalNumber(form.tan),
      oxidation: parseOptionalNumber(form.oxidation),
      waterPercent: parseOptionalNumber(form.waterPercent),
      particle4: parseOptionalNumber(form.particle4),
      particle6: parseOptionalNumber(form.particle6),
      particle14: parseOptionalNumber(form.particle14),
      sampleAnalysis: form.sampleAnalysis,
      alertType: form.alertType,
    };

    try {
      oilSampleService.saveLabResults(selectedId, input);
      setSuccess(true);
      setRevision((n) => n + 1);
      setForm(formFromSample(oilSampleService.findById(selectedId)!));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setSuccess(false);
    }
  }

  return (
    <div className="ur-page">
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.title)}</h1>
          <p className="ur-page__desc">{l(COPY.desc)}</p>
        </div>
        <StatusChip status="operational" label={l(COPY.liveData)} className="ur-page__sdk-badge" />
      </div>

      <div className="db-panel">
        <div className="db-panel__head">
          <span className="db-panel__title">{l(COPY.secSelect)}</span>
        </div>
        <div className="db-panel__body">
          {samples.length === 0 ? (
            <p className="db-panel__empty">{l(COPY.noSamples)}</p>
          ) : (
            <select
              className="ur-form-input"
              value={selectedId}
              onChange={(e) => handleSelectSample(e.target.value)}
              aria-label={l(COPY.secSelect)}
            >
              <option value="">{l(COPY.selPh)}</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sampleId} · {s.equipmentId} · {s.labSampleId}
                  {s.resultStatus ? ` · ${s.resultStatus}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selected && (
        <>
          <div className="db-panel">
            <div className="db-panel__head">
              <span className="db-panel__title">{l(COPY.secSummary)}</span>
              {selected.resultStatus && (
                <StatusChip
                  status={resultStatusChip(selected.resultStatus)}
                  label={l(RESULT_STATUS_LABELS[selected.resultStatus])}
                />
              )}
            </div>
            <div className="db-panel__body">
              <dl className="oc-detail-panel__fields">
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumSample)}</dt>
                  <dd>{selected.sampleId}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumLab)}</dt>
                  <dd>{selected.labSampleId}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumEquip)}</dt>
                  <dd>{selected.equipmentId}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumLp)}</dt>
                  <dd>{selected.lubricationPointId ?? l(COPY.none)}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumDate)}</dt>
                  <dd>{formatDate(selected.sampledAt)}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumLub)}</dt>
                  <dd>{selected.lubricant || l(COPY.none)}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumArea)}</dt>
                  <dd>{selected.area || l(COPY.none)}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumContr)}</dt>
                  <dd>{selected.contractorId || l(COPY.none)}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumLoc)}</dt>
                  <dd>{selected.samplingLocation || l(COPY.none)}</dd>
                </div>
                <div className="oc-detail-panel__field">
                  <dt>{l(COPY.sumStatus)}</dt>
                  <dd>{selected.status}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="db-panel">
            <div className="db-panel__head">
              <span className="db-panel__title">{l(COPY.secResults)}</span>
            </div>
            <div className="db-panel__body">
              {success && (
                <p className="db-panel__empty" role="status" style={{ color: 'var(--chip-operational-text)' }}>
                  {l(COPY.success)}
                </p>
              )}
              {error && <p className="ur-form-error" role="alert">{error}</p>}

              <div className="db-panel" style={{ marginBottom: '1rem' }}>
                <div className="db-panel__head">
                  <span className="db-panel__title">{l(COPY.secPreview)}</span>
                  {previewCondition && (
                    <StatusChip
                      status={conditionLevelChip(previewCondition)}
                      label={l(CONDITION_LABELS[previewCondition])}
                    />
                  )}
                </div>
                <div className="db-panel__body">
                  {previewCondition ? (
                    <p className="ur-form-hint">
                      {l(CONDITION_LABELS[previewCondition])}
                      {' — '}
                      {l(COPY.secPreview)}
                    </p>
                  ) : (
                    <p className="db-panel__empty">{l(COPY.previewNone)}</p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="ol-form-grid">
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-status">{l(COPY.fldStatus)}</label>
                    <select
                      id="lr-status"
                      className="ur-form-input"
                      value={form.resultStatus}
                      onChange={(e) => updateField('resultStatus', e.target.value as LabFormState['resultStatus'])}
                      required
                    >
                      <option value="">{l(COPY.selPh)}</option>
                      <option value="normal">{l(COPY.stNormal)}</option>
                      <option value="monitor">{l(COPY.stMonitor)}</option>
                      <option value="caution">{l(COPY.stCaution)}</option>
                      <option value="critical">{l(COPY.stCritical)}</option>
                    </select>
                  </div>

                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-contam">{l(COPY.fldContam)}</label>
                    <input id="lr-contam" className="ur-form-input" value={form.contaminationRating} onChange={(e) => updateField('contaminationRating', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-equip-r">{l(COPY.fldEquipR)}</label>
                    <input id="lr-equip-r" className="ur-form-input" value={form.equipmentRating} onChange={(e) => updateField('equipmentRating', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-lub-r">{l(COPY.fldLubR)}</label>
                    <input id="lr-lub-r" className="ur-form-input" value={form.lubricantRating} onChange={(e) => updateField('lubricantRating', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-pq">{l(COPY.fldPq)}</label>
                    <input id="lr-pq" type="number" min="0" step="any" className="ur-form-input" value={form.pqIndex} onChange={(e) => updateField('pqIndex', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-vis">{l(COPY.fldVis)}</label>
                    <input id="lr-vis" type="number" min="0" step="any" className="ur-form-input" value={form.viscosity100c} onChange={(e) => updateField('viscosity100c', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-tan">{l(COPY.fldTan)}</label>
                    <input id="lr-tan" type="number" min="0" step="any" className="ur-form-input" value={form.tan} onChange={(e) => updateField('tan', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-ox">{l(COPY.fldOx)}</label>
                    <input id="lr-ox" type="number" min="0" step="any" className="ur-form-input" value={form.oxidation} onChange={(e) => updateField('oxidation', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-water">{l(COPY.fldWater)}</label>
                    <input id="lr-water" type="number" min="0" step="any" className="ur-form-input" value={form.waterPercent} onChange={(e) => updateField('waterPercent', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-p4">{l(COPY.fldP4)}</label>
                    <input id="lr-p4" type="number" min="0" step="any" className="ur-form-input" value={form.particle4} onChange={(e) => updateField('particle4', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-p6">{l(COPY.fldP6)}</label>
                    <input id="lr-p6" type="number" min="0" step="any" className="ur-form-input" value={form.particle6} onChange={(e) => updateField('particle6', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-p14">{l(COPY.fldP14)}</label>
                    <input id="lr-p14" type="number" min="0" step="any" className="ur-form-input" value={form.particle14} onChange={(e) => updateField('particle14', e.target.value)} />
                  </div>
                  <div className="ur-form-field">
                    <label className="ur-form-label" htmlFor="lr-alert">{l(COPY.fldAlert)}</label>
                    <input id="lr-alert" className="ur-form-input" value={form.alertType} onChange={(e) => updateField('alertType', e.target.value)} />
                  </div>
                </div>

                <div className="ur-form-field">
                  <label className="ur-form-label" htmlFor="lr-analysis">{l(COPY.fldAnalysis)}</label>
                  <textarea
                    id="lr-analysis"
                    className="ur-form-input"
                    rows={3}
                    value={form.sampleAnalysis}
                    onChange={(e) => updateField('sampleAnalysis', e.target.value)}
                  />
                </div>

                <div className="ur-dialog__footer">
                  <button type="submit" className="ur-btn ur-btn--primary">{l(COPY.btnSave)}</button>
                  <button type="button" className="ur-btn ur-btn--ghost" onClick={handleReset}>{l(COPY.btnReset)}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
