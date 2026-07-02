// apps/owner-center/src/pages/oil-analysis/SampleIntake.tsx
// Oil Analysis — Sample Intake (Sprint 02).

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { StatusChip } from '../../components/StatusChip';
import { oilSampleService } from '../../modules/oil-analysis/sample.service';
import type { OilSampleCreateInput } from '../../modules/oil-analysis/sample.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  title:       { en: 'Sample Intake',           ar: 'استقبال العينات' },
  desc:        { en: 'Register a new oil analysis sample manually. LP reference fields only — no duplicate lubrication point data.', ar: 'تسجيل عينة تحليل زيت جديدة يدوياً. حقول مرجعية لنقطة التشحيم فقط — بدون إدخال بيانات نقطة مكررة.' },
  liveData:    { en: 'Manual intake',           ar: 'استقبال يدوي' },
  secForm:     { en: 'Sample Details',          ar: 'تفاصيل العينة' },
  fldEquip:    { en: 'Equipment ID *',          ar: 'معرّف المعدة *' },
  fldLp:       { en: 'LP ID (optional)',        ar: 'رمز النقطة (اختياري)' },
  fldLab:      { en: 'Lab Sample ID / Oil Report ID *', ar: 'معرّف عينة المختبر / تقرير الزيت *' },
  fldDate:     { en: 'Sample Date *',           ar: 'تاريخ العينة *' },
  fldLub:      { en: 'Lubricant',               ar: 'زيت التشحيم' },
  fldContr:    { en: 'Contractor',              ar: 'المقاول' },
  fldArea:     { en: 'Area',                    ar: 'المنطقة' },
  fldLoc:      { en: 'Sampling Point / Location', ar: 'نقطة / موقع أخذ العينة' },
  fldStatus:   { en: 'Status',                  ar: 'الحالة' },
  fldNotes:    { en: 'Notes',                   ar: 'ملاحظات' },
  stImported:  { en: 'Imported',                ar: 'مستورد' },
  stPending:   { en: 'Pending Review',          ar: 'بانتظار المراجعة' },
  btnSave:     { en: 'Save Sample',             ar: 'حفظ العينة' },
  btnReset:    { en: 'Reset',                   ar: 'إعادة تعيين' },
  btnRegistry: { en: 'View Registry',           ar: 'عرض السجل' },
  success:     { en: 'Sample registered successfully.', ar: 'تم تسجيل العينة بنجاح.' },
  dupWarn:     { en: 'This Lab Sample ID already exists.', ar: 'معرّف عينة المختبر هذا موجود مسبقاً.' },
} as const;

interface FormState {
  equipmentId: string;
  lubricationPointId: string;
  labSampleId: string;
  sampledAt: string;
  lubricant: string;
  contractorId: string;
  area: string;
  samplingLocation: string;
  status: 'imported' | 'pending-review';
  notes: string;
}

const EMPTY_FORM: FormState = {
  equipmentId: '',
  lubricationPointId: '',
  labSampleId: '',
  sampledAt: '',
  lubricant: '',
  contractorId: '',
  area: '',
  samplingLocation: '',
  status: 'imported',
  notes: '',
};

export default function SampleIntake(): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccessId(null);
    if (key === 'labSampleId') {
      setDupWarning(
        value.trim().length > 0 && oilSampleService.isLabSampleIdDuplicate(String(value)),
      );
    }
  }

  function handleReset(): void {
    setForm(EMPTY_FORM);
    setError(null);
    setSuccessId(null);
    setDupWarning(false);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (dupWarning) {
      setError(l(COPY.dupWarn));
      return;
    }

    const input: OilSampleCreateInput = {
      equipmentId: form.equipmentId,
      lubricationPointId: form.lubricationPointId || null,
      labSampleId: form.labSampleId,
      sampledAt: form.sampledAt,
      lubricant: form.lubricant,
      contractorId: form.contractorId,
      area: form.area,
      samplingLocation: form.samplingLocation,
      status: form.status,
      notes: form.notes,
    };

    try {
      const created = oilSampleService.create(input);
      setSuccessId(created.sampleId);
      setForm(EMPTY_FORM);
      setDupWarning(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setSuccessId(null);
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

      <div className="db-panel" style={{ maxWidth: 720 }}>
        <div className="db-panel__head">
          <span className="db-panel__title">{l(COPY.secForm)}</span>
        </div>
        <div className="db-panel__body">

        {successId && (
          <p className="db-panel__empty" role="status" style={{ color: 'var(--chip-operational-text)' }}>
            {l(COPY.success)} <strong>{successId}</strong>
            {' · '}
            <Link to="/oil-analysis/samples">{l(COPY.btnRegistry)}</Link>
          </p>
        )}

        {error && (
          <p className="ur-form-error" role="alert">{error}</p>
        )}

        {dupWarning && !error && (
          <p className="ur-form-error" role="alert">{l(COPY.dupWarn)}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="ol-form-grid">
            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-equip">{l(COPY.fldEquip)}</label>
              <input
                id="oa-equip"
                className="ur-form-input"
                value={form.equipmentId}
                onChange={(e) => updateField('equipmentId', e.target.value)}
                required
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-lp">{l(COPY.fldLp)}</label>
              <input
                id="oa-lp"
                className="ur-form-input"
                value={form.lubricationPointId}
                onChange={(e) => updateField('lubricationPointId', e.target.value)}
                placeholder="LP-001"
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-lab">{l(COPY.fldLab)}</label>
              <input
                id="oa-lab"
                className={`ur-form-input ${dupWarning ? 'ur-form-input--error' : ''}`}
                value={form.labSampleId}
                onChange={(e) => updateField('labSampleId', e.target.value)}
                required
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-date">{l(COPY.fldDate)}</label>
              <input
                id="oa-date"
                type="date"
                className="ur-form-input"
                value={form.sampledAt}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => updateField('sampledAt', e.target.value)}
                required
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-lub">{l(COPY.fldLub)}</label>
              <input
                id="oa-lub"
                className="ur-form-input"
                value={form.lubricant}
                onChange={(e) => updateField('lubricant', e.target.value)}
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-contr">{l(COPY.fldContr)}</label>
              <input
                id="oa-contr"
                className="ur-form-input"
                value={form.contractorId}
                onChange={(e) => updateField('contractorId', e.target.value)}
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-area">{l(COPY.fldArea)}</label>
              <input
                id="oa-area"
                className="ur-form-input"
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-loc">{l(COPY.fldLoc)}</label>
              <input
                id="oa-loc"
                className="ur-form-input"
                value={form.samplingLocation}
                onChange={(e) => updateField('samplingLocation', e.target.value)}
              />
            </div>

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="oa-status">{l(COPY.fldStatus)}</label>
              <select
                id="oa-status"
                className="ur-form-input"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as FormState['status'])}
              >
                <option value="imported">{l(COPY.stImported)}</option>
                <option value="pending-review">{l(COPY.stPending)}</option>
              </select>
            </div>
          </div>

          <div className="ur-form-field">
            <label className="ur-form-label" htmlFor="oa-notes">{l(COPY.fldNotes)}</label>
            <textarea
              id="oa-notes"
              className="ur-form-input"
              rows={3}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>

          <div className="ur-dialog__footer">
            <button type="submit" className="ur-btn ur-btn--primary" disabled={dupWarning}>
              {l(COPY.btnSave)}
            </button>
            <button type="button" className="ur-btn ur-btn--ghost" onClick={handleReset}>
              {l(COPY.btnReset)}
            </button>
            <button
              type="button"
              className="ur-btn ur-btn--ghost"
              onClick={() => navigate('/oil-analysis/samples')}
            >
              {l(COPY.btnRegistry)}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
