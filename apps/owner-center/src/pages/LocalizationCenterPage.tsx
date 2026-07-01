// apps/owner-center/src/pages/LocalizationCenterPage.tsx
// Localization Center — read-only language and dictionary overview.
//
// Phase 1L: connected to LanguageContext and static platform language config.
// No translation editing, no import/export, no API calls.
// Bilingual EN/AR with RTL support via dir attribute on the shell root.
//
// Platform rule: "Engineering identifiers are never translated.
//                 Only interface labels and controlled platform text are localized."

import React, { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SectionCard } from '../components/SectionCard';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import { BackToSettingsLink } from '../components/BackToSettingsLink';
import type { ChipStatus } from '../components/StatusChip';
import type { LocaleCode } from '../types/app-types';
import {
  PLATFORM_LANGUAGES,
  MODULE_DICTIONARIES,
  getLocalizationOverview,
} from '../types/localization-types';
import type { PlatformLanguage } from '../types/localization-types';

// ── Locale helpers ────────────────────────────────────────────────────────────

interface L10n {
  en: string;
  ar: string;
}

function t(bundle: L10n, locale: string): string {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const COPY = {
  pageTitle:  { en: 'Localization Center',      ar: 'مركز التوطين' },
  pageDesc:   { en: 'Review supported languages, dictionary coverage, RTL behaviour, and validation status across the platform shell.', ar: 'مراجعة اللغات المدعومة وتغطية القواميس وسلوك RTL وحالة التحقق عبر واجهة المنصة.' },
  sdkReady:   { en: 'Platform SDK ready',        ar: 'SDK المنصة جاهز' },

  ruleHeading: { en: 'Localization Scope Rule',  ar: 'قاعدة نطاق التوطين' },
  ruleText:    { en: 'Engineering identifiers are never translated. Only interface labels and controlled platform text are localized.', ar: 'لا تُترجم معرّفات الهندسة أبداً. يقتصر التوطين على تسميات الواجهة والنصوص الخاضعة للتحكم في المنصة.' },

  activeLangs:    { en: 'Active Languages',        ar: 'اللغات النشطة'      },
  defaultLang:    { en: 'Default Language',        ar: 'اللغة الافتراضية'   },
  rtlLangs:       { en: 'RTL Languages',           ar: 'لغات RTL'           },
  missingTrans:   { en: 'Missing Translations',    ar: 'الترجمات المفقودة'  },

  previewLang:    { en: 'Preview Language',        ar: 'معاينة اللغة'       },
  previewHint:    { en: 'Toggle the interface language to verify RTL layout and bilingual labels.', ar: 'بدّل لغة الواجهة للتحقق من تخطيط RTL والتسميات ثنائية اللغة.' },
  currentLocale:  { en: 'Current',                 ar: 'الحالية'            },

  colLanguage:    { en: 'Language',                ar: 'اللغة'              },
  colCode:        { en: 'Code',                    ar: 'الرمز'              },
  colDirection:   { en: 'Direction',               ar: 'الاتجاه'            },
  colStatus:      { en: 'Status',                  ar: 'الحالة'             },
  colDefault:     { en: 'Default',                 ar: 'افتراضي'            },

  statusActive:   { en: 'Active',                  ar: 'نشطة'               },
  statusInactive: { en: 'Inactive',                ar: 'غير نشطة'           },
  dirLtr:         { en: 'LTR',                     ar: 'LTR'                },
  dirRtl:         { en: 'RTL',                     ar: 'RTL'                },
  yes:            { en: 'Yes',                     ar: 'نعم'                },
  no:             { en: 'No',                      ar: 'لا'                 },

  platformDict:   { en: 'Platform Dictionary',     ar: 'قاموس المنصة'       },
  platformDictDesc: {
    en: 'Shell navigation and shared UI labels. {count} route labels registered across EN and AR.',
    ar: 'تنقل الواجهة وتسميات UI المشتركة. {count} تسمية مسار مسجّلة عبر EN و AR.',
  },

  moduleDicts:    { en: 'Module Dictionaries',     ar: 'قواميس الوحدات'     },
  moduleDictsDesc: {
    en: '{count} module dictionaries registered. Each module maintains bilingual labels for its own screens.',
    ar: '{count} قاموس وحدة مسجّل. تحتفظ كل وحدة بتسميات ثنائية اللغة لشاشاتها.',
  },

  engRule:        { en: 'Engineering Identifiers Rule', ar: 'قاعدة معرّفات الهندسة' },
  engRuleDesc:    { en: 'Engineering identifiers are never translated.', ar: 'لا تُترجم معرّفات الهندسة أبداً.' },

  rtl:            { en: 'RTL Support',               ar: 'دعم RTL'            },
  rtlDesc:        { en: 'Arabic (ar) uses right-to-left layout. The shell applies dir and lang attributes when Arabic is active.', ar: 'تستخدم العربية (ar) تخطيطاً من اليمين إلى اليسار. تطبّق الواجهة سمات dir و lang عند تفعيل العربية.' },

  validation:     { en: 'Validation',                ar: 'التحقق'             },
  validationDesc: { en: 'Coverage checks for untranslated keys and formatting inconsistencies will run here. Not yet available.', ar: 'ستُجرى هنا فحوصات التغطية للمفاتيح غير المترجمة وتناقضات التنسيق. غير متاحة بعد.' },

  placeholderCta: { en: 'Read-only',                 ar: 'للقراءة فقط'        },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function LanguageToggle({
  locale,
  setLocale,
}: {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
}): React.ReactElement {
  const isAr = locale === 'ar';
  const next: LocaleCode = isAr ? 'en' : 'ar';

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => { setLocale(next); }}
      aria-label={isAr ? 'Switch to English' : 'Switch to Arabic'}
    >
      {isAr ? 'EN' : 'AR'}
    </button>
  );
}

function languageStatusChip(status: PlatformLanguage['status'], locale: string): { chipStatus: ChipStatus; label: string } {
  if (status === 'active') {
    return { chipStatus: 'operational', label: t(COPY.statusActive, locale) };
  }
  return { chipStatus: 'draft', label: t(COPY.statusInactive, locale) };
}

function formatDesc(template: L10n, locale: string, count: number): string {
  return t(template, locale).replace('{count}', String(count));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LocalizationCenterPage(): React.ReactElement {
  const { locale, setLocale } = useLanguage();
  usePlatformSdk();

  const overview = useMemo(() => getLocalizationOverview(), []);

  const defaultLangName = locale === 'ar'
    ? overview.defaultLanguage.name.ar
    : overview.defaultLanguage.name.en;

  const sections = useMemo(() => [
    {
      titleEn: COPY.platformDict.en,
      title: t(COPY.platformDict, locale),
      description: formatDesc(COPY.platformDictDesc, locale, overview.platformLabelCount),
    },
    {
      titleEn: COPY.moduleDicts.en,
      title: t(COPY.moduleDicts, locale),
      description: formatDesc(COPY.moduleDictsDesc, locale, overview.moduleDictionaryCount),
    },
    {
      titleEn: COPY.engRule.en,
      title: t(COPY.engRule, locale),
      description: t(COPY.engRuleDesc, locale),
    },
    {
      titleEn: COPY.rtl.en,
      title: t(COPY.rtl, locale),
      description: t(COPY.rtlDesc, locale),
    },
    {
      titleEn: COPY.validation.en,
      title: t(COPY.validation, locale),
      description: t(COPY.validationDesc, locale),
    },
  ], [locale, overview.platformLabelCount, overview.moduleDictionaryCount]);

  return (
    <div className="ur-page">

      <BackToSettingsLink />

      {/* ── Page header ── */}
      <div className="ur-page__header">
        <div className="ur-page__header-text">
          <h1 className="ur-page__title">{t(COPY.pageTitle, locale)}</h1>
          <p className="ur-page__desc">{t(COPY.pageDesc, locale)}</p>
        </div>
        <StatusChip
          status="operational"
          label={t(COPY.sdkReady, locale)}
          className="ur-page__sdk-badge"
        />
      </div>

      {/* ── Localization scope rule ── */}
      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard
          value={String(overview.activeLanguageCount)}
          label={t(COPY.activeLangs, locale)}
          modifier="neutral"
        />
        <SummaryCard
          value={defaultLangName}
          label={t(COPY.defaultLang, locale)}
          modifier="info"
        />
        <SummaryCard
          value={String(overview.rtlLanguageCount)}
          label={t(COPY.rtlLangs, locale)}
          modifier="warning"
        />
        <SummaryCard
          value={overview.missingTranslationsPlaceholder}
          label={t(COPY.missingTrans, locale)}
          modifier="caution"
        />
      </div>

      {/* ── Language preview toggle ── */}
      <div className="ur-toolbar">
        <span className="ur-form-label">{t(COPY.previewLang, locale)}</span>
        <LanguageToggle locale={locale} setLocale={setLocale} />
        <span className="ur-table__desc">
          {t(COPY.currentLocale, locale)}: {locale.toUpperCase()} — {t(COPY.previewHint, locale)}
        </span>
      </div>

      {/* ── Languages table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colLanguage, locale)}</th>
              <th>{t(COPY.colCode, locale)}</th>
              <th>{t(COPY.colDirection, locale)}</th>
              <th>{t(COPY.colStatus, locale)}</th>
              <th>{t(COPY.colDefault, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORM_LANGUAGES.map((lang) => {
              const chip = languageStatusChip(lang.status, locale);
              const isCurrent = lang.code === locale;
              return (
                <tr key={lang.code} aria-current={isCurrent ? 'true' : undefined}>
                  <td>
                    <div className="ur-user-name">
                      {locale === 'ar' ? lang.name.ar : lang.name.en}
                    </div>
                    {isCurrent && (
                      <StatusChip
                        status="operational"
                        label={t(COPY.currentLocale, locale)}
                      />
                    )}
                  </td>
                  <td>{lang.code}</td>
                  <td>{lang.direction === 'rtl' ? t(COPY.dirRtl, locale) : t(COPY.dirLtr, locale)}</td>
                  <td>
                    <StatusChip status={chip.chipStatus} label={chip.label} />
                  </td>
                  <td>{lang.isDefault ? t(COPY.yes, locale) : t(COPY.no, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Module dictionary list (compact) ── */}
      {MODULE_DICTIONARIES.length > 0 && (
        <p className="ur-table__desc">
          {formatDesc(COPY.moduleDictsDesc, locale, MODULE_DICTIONARIES.length)}
          {' '}
          ({MODULE_DICTIONARIES.map((m) => m.moduleId).join(', ')})
        </p>
      )}

      {/* ── Dictionary overview sections ── */}
      <div className="ur-sections-grid">
        {sections.map((section) => (
          <SectionCard
            key={section.titleEn}
            titleEn={section.titleEn}
            title={section.title}
            description={section.description}
            cta={t(COPY.placeholderCta, locale)}
          />
        ))}
      </div>

    </div>
  );
}
