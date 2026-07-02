// apps/owner-center/src/pages/oil-analysis/LpMapping.tsx
// Oil Analysis — Engineer LP Confirmation (Patch A-01).

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { StatusChip } from '../../components/StatusChip';
import type { ChipStatus } from '../../components/StatusChip';
import { SummaryCard } from '../../components/SummaryCard';
import { OilAnalysisActionButton } from '../../components/oil-analysis/OilAnalysisActionButton';
import { useOilAnalysisPermissions } from '../../hooks/useOilAnalysisPermissions';
import { oilSampleService } from '../../modules/oil-analysis/sample.service';
import type { OilSampleRow, OilSampleLpMappingHistoryEntry } from '../../modules/oil-analysis/sample.service';
import { findEquipmentById } from '../../modules/oil-analysis/equipment-master.service';
import { lubricationPointService } from '../../modules/oil-lubrication/lubrication-point.service';
import type { LpExplorerRow } from '../../modules/oil-lubrication/lubrication-point.service';

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

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const COPY = {
  title:        { en: 'LP Mapping',                    ar: 'ربط نقطة التشحيم' },
  desc:         { en: 'Confirm lubrication point assignment for imported samples.', ar: 'تأكيد ربط نقطة التشحيم للعينات المستوردة.' },
  liveData:     { en: 'Engineer confirmation',         ar: 'تأكيد المهندس' },
  sumQueue:     { en: 'Needs LP Mapping',              ar: 'تحتاج ربط نقطة' },
  emptyQueue:   { en: 'No samples awaiting LP mapping.', ar: 'لا توجد عينات بانتظار ربط نقطة التشحيم.' },
  selectSample: { en: 'Select a sample to confirm LP mapping.', ar: 'اختر عينة لتأكيد ربط نقطة التشحيم.' },
  dpTitle:      { en: 'LP Confirmation',               ar: 'تأكيد نقطة التشحيم' },
  dpClose:      { en: 'Close',                         ar: 'إغلاق' },
  dpSample:     { en: 'Sample ID',                     ar: 'معرّف العينة' },
  dpEquip:      { en: 'Equipment',                     ar: 'المعدة' },
  dpEquipName:  { en: 'Equipment Name',                ar: 'اسم المعدة' },
  dpArea:       { en: 'Area',                          ar: 'المنطقة' },
  dpContr:      { en: 'Contractor',                    ar: 'المقاول' },
  dpStatus:     { en: 'Status',                        ar: 'الحالة' },
  secLps:       { en: 'Available Lubrication Points',  ar: 'نقاط التشحيم المتاحة' },
  secSelected:  { en: 'Selected LP',                   ar: 'النقطة المختارة' },
  secHistory:   { en: 'Confirmation History',          ar: 'سجل التأكيد' },
  histEmpty:    { en: 'No LP confirmations recorded yet.', ar: 'لم يُسجَّل أي تأكيد لنقطة التشحيم بعد.' },
  noLps:        { en: 'No active lubrication points for this equipment.', ar: 'لا توجد نقاط تشحيم نشطة لهذه المعدة.' },
  btnConfirm:   { en: 'Confirm LP Mapping',            ar: 'تأكيد ربط النقطة' },
  notesLabel:   { en: 'Notes (optional)',              ar: 'ملاحظات (اختياري)' },
  success:      { en: 'LP mapping confirmed. Sample status set to Linked.', ar: 'تم تأكيد ربط النقطة. حالة العينة: مرتبط.' },
  stNeeds:      { en: 'Needs LP Mapping',              ar: 'يحتاج ربط نقطة' },
  stLinked:     { en: 'Linked',                        ar: 'مرتبط' },
  colLp:        { en: 'LP ID',                         ar: 'رمز النقطة' },
  colName:      { en: 'Point Name',                    ar: 'اسم النقطة' },
  colOil:       { en: 'Oil Type',                      ar: 'نوع الزيت' },
} as const;

function statusChip(status: OilSampleRow['status']): ChipStatus {
  if (status === 'linked') return 'operational';
  if (status === 'needs-lp-mapping') return 'warning';
  return 'maintenance';
}

function listLpsForEquipment(equipmentId: string): readonly LpExplorerRow[] {
  return lubricationPointService
    .list()
    .filter((lp) => lp.equipmentId === equipmentId && lp.isActive)
    .sort((a, b) => a.lubricationPointId.localeCompare(b.lubricationPointId));
}

interface QueueListProps {
  readonly rows: readonly OilSampleRow[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly locale: string;
}

function QueueList({ rows, selectedId, onSelect, locale }: QueueListProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);

  if (rows.length === 0) {
    return <p className="db-panel__empty">{l(COPY.emptyQueue)}</p>;
  }

  return (
    <ul className="ol-db-list">
      {rows.map((row) => {
        const isSelected = row.id === selectedId;
        return (
          <li key={row.id}>
            <button
              type="button"
              className={`ol-db-list__item ol-db-list__item--button ${isSelected ? 'ol-db-list__item--selected' : ''}`}
              onClick={() => onSelect(row.id)}
            >
              <span className="ol-db-list__badge">{row.sampleId}</span>
              <span className="ol-db-list__name">{row.equipmentId}</span>
              <span className="ol-db-list__meta">
                {row.labSampleId} · {formatDate(row.sampledAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface DetailPanelProps {
  readonly row: OilSampleRow;
  readonly locale: string;
  readonly actor: string;
  readonly onClose: () => void;
  readonly onUpdated: () => void;
}

function DetailPanel({ row, locale, actor, onClose, onUpdated }: DetailPanelProps): React.ReactElement {
  const l = (b: L10n<string>) => t(b, locale);
  const permissions = useOilAnalysisPermissions();
  const equipment = findEquipmentById(row.equipmentId);
  const availableLps = useMemo(() => listLpsForEquipment(row.equipmentId), [row.equipmentId]);
  const [selectedLpId, setSelectedLpId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedLp = availableLps.find((lp) => lp.lubricationPointId === selectedLpId) ?? null;
  const canConfirm = row.status === 'needs-lp-mapping' || (!row.lubricationPointId && row.status !== 'linked');

  function handleConfirm(): void {
    if (!selectedLpId) {
      setError('Select a lubrication point.');
      return;
    }
    try {
      oilSampleService.confirmLpMapping(row.id, selectedLpId, actor, notes);
      setSuccess(l(COPY.success));
      setError(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed.');
      setSuccess(null);
    }
  }

  return (
    <aside className="oc-detail-panel" aria-label={l(COPY.dpTitle)}>
      <div className="oc-detail-panel__head">
        <span className="oc-detail-panel__title">{l(COPY.dpTitle)}</span>
        <button type="button" className="ur-btn ur-btn--ghost ur-btn--sm" onClick={onClose}>
          {l(COPY.dpClose)}
        </button>
      </div>

      <div className="oc-detail-panel__status-row">
        <span className="ur-badge ur-badge--sm">{row.sampleId}</span>
        <StatusChip
          status={statusChip(row.status)}
          label={row.status === 'linked' ? l(COPY.stLinked) : l(COPY.stNeeds)}
        />
      </div>

      {success && (
        <p className="db-panel__empty" role="status" style={{ color: 'var(--chip-operational-text)' }}>
          {success}
        </p>
      )}
      {error && <p className="ur-form-error" role="alert">{error}</p>}

      <dl className="oc-detail-panel__fields">
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpSample)}</dt>
          <dd>{row.sampleId}</dd>
        </div>
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpEquip)}</dt>
          <dd>{row.equipmentId}</dd>
        </div>
        {equipment && (
          <>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpEquipName)}</dt>
              <dd>{equipment.equipmentName}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpArea)}</dt>
              <dd>{equipment.area}</dd>
            </div>
            <div className="oc-detail-panel__field">
              <dt>{l(COPY.dpContr)}</dt>
              <dd>{equipment.contractorId}</dd>
            </div>
          </>
        )}
        <div className="oc-detail-panel__field">
          <dt>{l(COPY.dpStatus)}</dt>
          <dd>{row.status === 'linked' ? l(COPY.stLinked) : l(COPY.stNeeds)}</dd>
        </div>
      </dl>

      {canConfirm && (
        <div className="db-panel">
          <div className="db-panel__head">
            <span className="db-panel__title">{l(COPY.secLps)}</span>
          </div>
          <div className="db-panel__body">
            {availableLps.length === 0 ? (
              <p className="db-panel__empty">{l(COPY.noLps)}</p>
            ) : (
              <div className="oa-lp-picker">
                {availableLps.map((lp) => (
                  <label key={lp.id} className="oa-lp-picker__option">
                    <input
                      type="radio"
                      name={`lp-${row.id}`}
                      value={lp.lubricationPointId}
                      checked={selectedLpId === lp.lubricationPointId}
                      onChange={() => setSelectedLpId(lp.lubricationPointId)}
                    />
                    <span className="oa-lp-picker__option-body">
                      <strong>{lp.lubricationPointId}</strong> — {lp.name}
                      <span className="oa-lp-picker__option-meta">{lp.oilType}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {selectedLp && (
              <div className="oa-lp-picker__selected">
                <h4 className="oa-lp-picker__selected-title">{l(COPY.secSelected)}</h4>
                <p>
                  <strong>{l(COPY.colLp)}:</strong> {selectedLp.lubricationPointId}
                  {' · '}
                  <strong>{l(COPY.colName)}:</strong> {selectedLp.name}
                  {' · '}
                  <strong>{l(COPY.colOil)}:</strong> {selectedLp.oilType}
                </p>
              </div>
            )}

            <div className="ur-form-field">
              <label className="ur-form-label" htmlFor="lp-notes">{l(COPY.notesLabel)}</label>
              <textarea
                id="lp-notes"
                className="ur-form-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <OilAnalysisActionButton
              type="button"
              className="ur-btn ur-btn--primary"
              allowed={permissions.canConfirmLpMapping}
              disabled={!selectedLpId || availableLps.length === 0}
              onClick={handleConfirm}
            >
              {l(COPY.btnConfirm)}
            </OilAnalysisActionButton>
          </div>
        </div>
      )}

      <div className="oc-detail-panel__history">
        <h3 className="oc-detail-panel__history-title">{l(COPY.secHistory)}</h3>
        {row.lpMappingHistory.length === 0 ? (
          <p className="oc-detail-panel__history-empty">{l(COPY.histEmpty)}</p>
        ) : (
          <ul className="oc-detail-panel__history-list">
            {[...row.lpMappingHistory].reverse().map((entry: OilSampleLpMappingHistoryEntry, idx) => (
              <li key={`${entry.at}-${idx}`} className="oc-detail-panel__history-item">
                <span className="oc-detail-panel__history-action">
                  {entry.lubricationPointId} — {entry.fromStatus} → {entry.toStatus}
                </span>
                <span className="oc-detail-panel__history-meta">
                  {entry.actor} · {formatDateTime(entry.at)}
                </span>
                {entry.notes && (
                  <span className="oc-detail-panel__history-notes">{entry.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default function LpMapping(): React.ReactElement {
  const { locale } = useLanguage();
  const { user } = useAuth();
  const l = (b: L10n<string>) => t(b, locale);

  const actor = user?.displayName ?? user?.email ?? 'Engineer';
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = useMemo(() => oilSampleService.listLpMappingQueue(), [revision]);
  const selected = selectedId ? oilSampleService.findById(selectedId) : null;
  const hasDetail = selected !== null;

  return (
    <div className="ur-page oc-page">
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{l(COPY.title)}</h1>
          <p className="ur-page__desc">{l(COPY.desc)}</p>
        </div>
        <StatusChip status="operational" label={l(COPY.liveData)} className="ur-page__sdk-badge" />
      </div>

      <div className="ur-summary-grid">
        <SummaryCard value={String(queue.length)} label={l(COPY.sumQueue)} modifier="warning" />
      </div>

      <div className={`oc-workspace ${hasDetail ? 'oc-workspace--split' : ''}`}>
        <div className="oc-workspace__list">
          <div className="db-panel">
            <div className="db-panel__head">
              <span className="db-panel__title">{l(COPY.sumQueue)}</span>
            </div>
            <div className="db-panel__body">
              <QueueList
                rows={queue}
                selectedId={selectedId}
                onSelect={setSelectedId}
                locale={locale}
              />
            </div>
          </div>
          {!hasDetail && (
            <p className="oc-workspace__hint">{l(COPY.selectSample)}</p>
          )}
        </div>

        {selected && (
          <DetailPanel
            row={selected}
            locale={locale}
            actor={actor}
            onClose={() => setSelectedId(null)}
            onUpdated={() => setRevision((n) => n + 1)}
          />
        )}
      </div>
    </div>
  );
}
