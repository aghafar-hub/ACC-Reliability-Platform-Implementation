// apps/owner-center/src/pages/BrandingCenterPage.tsx
// Branding Center — read-only branding overview backed by shell infrastructure.
//
// Phase 1M: connected to ThemeContext, BrandingContext, KNOWN_THEMES, and
// PWA manifest metadata. No upload, no persistence, no audit records on view.
// Bilingual EN/AR with RTL support via dir attribute on the shell root.

import React, { useMemo } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { usePlatformSdk } from '../context/SdkContext';
import { SectionCard } from '../components/SectionCard';
import { SummaryCard } from '../components/SummaryCard';
import { StatusChip } from '../components/StatusChip';
import { BackToSettingsLink } from '../components/BackToSettingsLink';
import type { ChipStatus } from '../components/StatusChip';
import {
  BRANDING_RULES,
  PLATFORM_THEMES,
  getBrandingOverview,
} from '../types/branding-overview-types';

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
  pageTitle:  { en: 'Branding Center',         ar: 'مركز العلامة التجارية' },
  pageDesc:   { en: 'Review active themes, logos, appearance settings, and platform branding rules across the Owner Center shell.', ar: 'مراجعة السمات النشطة والشعارات وإعدادات المظهر وقواعد العلامة التجارية للمنصة عبر واجهة مركز المالك.' },
  liveData:   { en: 'Live data',                ar: 'بيانات حية' },

  ruleHeading: { en: 'Branding Consistency Rule', ar: 'قاعدة اتساق العلامة التجارية' },
  ruleText:    { en: 'ACC branding is always displayed first. Contractor logo is displayed beneath ACC when applicable. Engineering identifiers are never branded.', ar: 'تُعرض علامة ACC التجارية دائماً أولاً. يُعرض شعار المقاول أسفل ACC عند الاقتضاء. لا تُعلَّم معرّفات الهندسة أبداً.' },

  activeTheme:     { en: 'Active Theme',          ar: 'السمة النشطة'       },
  availableThemes: { en: 'Available Themes',      ar: 'السمات المتاحة'     },
  brandingAssets:  { en: 'Branding Assets',       ar: 'أصول العلامة التجارية' },
  currentLogo:     { en: 'Current Logo',          ar: 'الشعار الحالي'      },

  colTheme:        { en: 'Theme',                 ar: 'السمة'              },
  colAccent:       { en: 'Accent Color',          ar: 'لون التمييز'        },
  colStatus:       { en: 'Status',                ar: 'الحالة'             },
  current:         { en: 'Active',                ar: 'نشطة'               },

  themesSection:   { en: 'Themes',                ar: 'السمات'             },
  logosSection:    { en: 'Logos',                 ar: 'الشعارات'           },
  appearanceSection:{ en: 'Appearance',           ar: 'المظهر'             },
  rulesSection:    { en: 'Branding Rules',        ar: 'قواعد العلامة التجارية' },

  currentTheme:    { en: 'Current Theme',         ar: 'السمة الحالية'      },
  darkSupport:     { en: 'Dark Theme Support',    ar: 'دعم السمة الداكنة'  },
  accentColor:     { en: 'Accent Color',          ar: 'لون التمييز'        },

  accLogo:         { en: 'ACC Logo',              ar: 'شعار ACC'           },
  contractorLogo:  { en: 'Contractor Logo Support', ar: 'دعم شعار المقاول' },
  appIcon:         { en: 'Application Icon',      ar: 'أيقونة التطبيق'     },
  darkIcon:        { en: 'Dark Theme Icon Support', ar: 'دعم أيقونة السمة الداكنة' },

  lightMode:       { en: 'Light Mode',            ar: 'الوضع الفاتح'       },
  darkMode:        { en: 'Dark Mode',             ar: 'الوضع الداكن'       },
  systemTheme:     { en: 'System Theme',          ar: 'سمة النظام'         },
  mobileIcon:      { en: 'Mobile Icon Support',   ar: 'دعم أيقونة الجوال'  },

  supported:       { en: 'Supported',             ar: 'مدعوم'              },
  notConfigured:   { en: 'Not configured',        ar: 'غير مُكوَّن'         },
  notAvailable:    { en: 'Not available',         ar: 'غير متاح'           },
  active:          { en: 'Active',                ar: 'نشط'                },
  inactive:        { en: 'Inactive',              ar: 'غير نشط'            },

  placeholderCta:  { en: 'Read-only',               ar: 'للقراءة فقط'        },
} as const;

// ── Helper utilities ──────────────────────────────────────────────────────────

function yesNo(supported: boolean, locale: string): string {
  return supported ? t(COPY.supported, locale) : t(COPY.notAvailable, locale);
}

function formatSectionDesc(lines: readonly string[]): string {
  return lines.join(' · ');
}

function supportChip(
  supported: boolean,
  locale: string,
): { chipStatus: ChipStatus; label: string } {
  if (supported) {
    return { chipStatus: 'operational', label: t(COPY.supported, locale) };
  }
  return { chipStatus: 'draft', label: t(COPY.notAvailable, locale) };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BrandingCenterPage(): React.ReactElement {
  const { locale } = useLanguage();
  const { branding } = useBranding();
  const { theme } = useTheme();
  usePlatformSdk();

  const overview = useMemo(
    () => getBrandingOverview(branding, theme),
    [branding, theme],
  );

  const activeThemeName = locale === 'ar'
    ? overview.activeThemeName.ar
    : overview.activeThemeName.en;

  const iconSummary = overview.applicationIcons
    .map((icon) => icon.sizes)
    .join(', ');

  const sections = useMemo(() => [
    {
      titleEn: COPY.themesSection.en,
      title: t(COPY.themesSection, locale),
      description: formatSectionDesc([
        `${t(COPY.currentTheme, locale)}: ${activeThemeName}`,
        `${t(COPY.availableThemes, locale)}: ${overview.availableThemeCount}`,
        `${t(COPY.darkSupport, locale)}: ${yesNo(overview.darkThemeSupported, locale)}`,
        `${t(COPY.accentColor, locale)}: ${overview.accentColor}`,
      ]),
    },
    {
      titleEn: COPY.logosSection.en,
      title: t(COPY.logosSection, locale),
      description: formatSectionDesc([
        `${t(COPY.accLogo, locale)}: ${overview.accLogoLabel}`,
        `${t(COPY.contractorLogo, locale)}: ${yesNo(overview.contractorLogoSupported, locale)}${overview.contractorLogoActive ? ` (${t(COPY.active, locale)})` : ` (${t(COPY.inactive, locale)})`}`,
        `${t(COPY.appIcon, locale)}: ${overview.applicationIcons.map((i) => i.src).join(', ')}`,
        `${t(COPY.darkIcon, locale)}: ${overview.darkThemeIconConfigured ? t(COPY.supported, locale) : t(COPY.notConfigured, locale)}`,
      ]),
    },
    {
      titleEn: COPY.appearanceSection.en,
      title: t(COPY.appearanceSection, locale),
      description: formatSectionDesc([
        `${t(COPY.lightMode, locale)}: ${yesNo(overview.lightModeSupported, locale)}`,
        `${t(COPY.darkMode, locale)}: ${yesNo(overview.darkModeSupported, locale)}`,
        `${t(COPY.systemTheme, locale)}: ${overview.systemThemeSupported ? t(COPY.supported, locale) : t(COPY.notAvailable, locale)}`,
        `${t(COPY.mobileIcon, locale)}: ${overview.mobileIconSupported ? `${t(COPY.supported, locale)} (${iconSummary})` : t(COPY.notConfigured, locale)}`,
      ]),
    },
    {
      titleEn: COPY.rulesSection.en,
      title: t(COPY.rulesSection, locale),
      description: BRANDING_RULES.map((rule) => t(rule, locale)).join(' '),
    },
  ], [locale, overview, activeThemeName, iconSummary]);

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
          label={t(COPY.liveData, locale)}
          className="ur-page__sdk-badge"
        />
      </div>

      {/* ── Branding consistency rule ── */}
      <div className="con-rule" role="note" aria-label={t(COPY.ruleHeading, locale)}>
        <span className="con-rule__heading">{t(COPY.ruleHeading, locale)}</span>
        <span className="con-rule__text">{t(COPY.ruleText, locale)}</span>
      </div>

      {/* ── Summary cards ── */}
      <div className="ur-summary-grid">
        <SummaryCard
          value={activeThemeName}
          label={t(COPY.activeTheme, locale)}
          modifier="neutral"
        />
        <SummaryCard
          value={String(overview.availableThemeCount)}
          label={t(COPY.availableThemes, locale)}
          modifier="info"
        />
        <SummaryCard
          value={String(overview.brandingAssetCount)}
          label={t(COPY.brandingAssets, locale)}
          modifier="warning"
        />
        <SummaryCard
          value={overview.currentLogoLabel}
          label={t(COPY.currentLogo, locale)}
          modifier="caution"
        />
      </div>

      {/* ── Themes table ── */}
      <div className="ur-table-wrap">
        <table className="ur-table">
          <thead>
            <tr>
              <th>{t(COPY.colTheme, locale)}</th>
              <th>{t(COPY.colAccent, locale)}</th>
              <th>{t(COPY.colStatus, locale)}</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORM_THEMES.map((entry) => {
              const isActive = entry.id === overview.activeThemeId;
              const chip = supportChip(true, locale);
              return (
                <tr key={entry.id} aria-current={isActive ? 'true' : undefined}>
                  <td>
                    <div className="ur-user-name">
                      {locale === 'ar' ? entry.name.ar : entry.name.en}
                    </div>
                    {isActive && (
                      <StatusChip
                        status="operational"
                        label={t(COPY.current, locale)}
                      />
                    )}
                  </td>
                  <td>{entry.accentColor}</td>
                  <td>
                    <StatusChip status={chip.chipStatus} label={chip.label} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Branding sections ── */}
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
