// apps/owner-center/src/pages/oil-analysis/EquipmentPicker.tsx
// Searchable equipment picker — Equipment Master source, no free typing.

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  findEquipmentById,
  searchEquipment,
} from '../../modules/oil-analysis/equipment-master.service';
import type { EquipmentMasterRow } from '../../modules/oil-analysis/equipment-master.service';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  label:       { en: 'Equipment *',              ar: 'المعدة *' },
  searchPh:    { en: 'Search equipment ID, name, area…', ar: 'ابحث بمعرّف المعدة أو الاسم أو المنطقة…' },
  empty:       { en: 'No equipment matches your search.', ar: 'لا توجد معدات تطابق البحث.' },
  hint:        { en: 'Select from Equipment Master — typing is for search only.', ar: 'اختر من سجل المعدات — الكتابة للبحث فقط.' },
  colId:       { en: 'Equipment ID',             ar: 'معرّف المعدة' },
  colName:     { en: 'Name',                     ar: 'الاسم' },
  colArea:     { en: 'Area',                     ar: 'المنطقة' },
  colContr:    { en: 'Contractor',               ar: 'المقاول' },
  clear:       { en: 'Clear selection',          ar: 'مسح الاختيار' },
} as const;

export interface EquipmentPickerProps {
  readonly value: string;
  readonly onChange: (equipmentId: string, equipment: EquipmentMasterRow | null) => void;
  readonly disabled?: boolean;
  readonly id?: string;
}

export default function EquipmentPicker({
  value,
  onChange,
  disabled = false,
  id = 'oa-equip-picker',
}: EquipmentPickerProps): React.ReactElement {
  const { locale } = useLanguage();
  const l = (b: L10n<string>) => t(b, locale);

  const selected = useMemo(() => (value ? findEquipmentById(value) : null), [value]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => searchEquipment(query), [query]);

  function handleSelect(row: EquipmentMasterRow): void {
    onChange(row.equipmentId, row);
    setQuery('');
    setOpen(false);
  }

  function handleClear(): void {
    onChange('', null);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="oa-equip-picker">
      <label className="ur-form-label" htmlFor={id}>{l(COPY.label)}</label>
      <p className="ur-form-hint">{l(COPY.hint)}</p>

      {selected && (
        <div className="oa-equip-picker__selected">
          <div className="oa-equip-picker__selected-grid">
            <span><strong>{l(COPY.colId)}:</strong> {selected.equipmentId}</span>
            <span><strong>{l(COPY.colName)}:</strong> {selected.equipmentName}</span>
            <span><strong>{l(COPY.colArea)}:</strong> {selected.area}</span>
            <span><strong>{l(COPY.colContr)}:</strong> {selected.contractorId}</span>
          </div>
          {!disabled && (
            <button type="button" className="ur-btn ur-btn--ghost ur-btn--sm" onClick={handleClear}>
              {l(COPY.clear)}
            </button>
          )}
        </div>
      )}

      {!selected && (
        <>
          <input
            id={id}
            className="ur-form-input"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={l(COPY.searchPh)}
            disabled={disabled}
            autoComplete="off"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            role="combobox"
          />
          {open && (
            <ul id={`${id}-listbox`} className="oa-equip-picker__list" role="listbox">
              {results.length === 0 ? (
                <li className="oa-equip-picker__empty">{l(COPY.empty)}</li>
              ) : (
                results.map((row) => (
                  <li key={row.equipmentId}>
                    <button
                      type="button"
                      className="oa-equip-picker__option"
                      role="option"
                      onClick={() => handleSelect(row)}
                    >
                      <span className="oa-equip-picker__option-id">{row.equipmentId}</span>
                      <span className="oa-equip-picker__option-meta">
                        {row.equipmentName} · {row.area} · {row.contractorId}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
