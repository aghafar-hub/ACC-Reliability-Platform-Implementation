// apps/owner-center/src/pages/oil-analysis/OaRoutePlaceholder.tsx
// Placeholder shell for Oil Analysis screens not yet implemented (OA-002, OA-003).

import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui';

interface L10n<T> { en: T; ar: T; }

function t<T>(bundle: L10n<T>, locale: string): T {
  return locale === 'ar' ? bundle.ar : bundle.en;
}

const COPY = {
  comingSoon: { en: 'Available in a future sprint', ar: 'متاح في sprint قادم' },
  backRegister: { en: 'Back to Equipment & LP Register', ar: 'العودة إلى سجل المعدات ونقاط التشحيم' },
} as const;

export interface OaRoutePlaceholderProps {
  readonly locale: string;
  readonly title: L10n<string>;
  readonly subtitle: L10n<string>;
  readonly breadcrumbs: L10n<string>[];
  readonly meta?: ReadonlyArray<{ label: L10n<string>; value: string }>;
}

export function OaRoutePlaceholder({
  locale,
  title,
  subtitle,
  breadcrumbs,
  meta,
}: OaRoutePlaceholderProps): React.ReactElement {
  const l = (bundle: L10n<string>) => t(bundle, locale);

  return (
    <div className="acc-oa-page">
      <PageHeader
        title={l(title)}
        subtitle={l(subtitle)}
        breadcrumbs={breadcrumbs.map((label, index) => ({
          label: l(label),
          href: index === breadcrumbs.length - 1 ? undefined : '/oil-analysis/register',
        }))}
      />
      {meta && meta.length > 0 && (
        <dl className="acc-oa-placeholder__meta">
          {meta.map((item) => (
            <div key={item.label.en} className="acc-oa-placeholder__meta-item">
              <dt>{l(item.label)}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="acc-oa-placeholder__status">{l(COPY.comingSoon)}</p>
      <Link to="/oil-analysis/register" className="acc-btn acc-btn--secondary">
        {l(COPY.backRegister)}
      </Link>
    </div>
  );
}

export function EquipmentDetailsPlaceholder({ locale }: { locale: string }): React.ReactElement {
  const { equipmentId = '' } = useParams<{ equipmentId: string }>();
  const [params] = useSearchParams();
  const lpId = params.get('lp') ?? '';

  return (
    <OaRoutePlaceholder
      locale={locale}
      title={{ en: 'Equipment Details', ar: 'تفاصيل المعدة' }}
      subtitle={{
        en: 'Digital equipment passport — OA-002 placeholder.',
        ar: 'جواز المعدة الرقمي — عنصر نائب OA-002.',
      }}
      breadcrumbs={[
        { en: 'Oil Analysis', ar: 'تحليل الزيت' },
        { en: 'Equipment & LP Register', ar: 'سجل المعدات ونقاط التشحيم' },
        { en: 'Equipment Details', ar: 'تفاصيل المعدة' },
      ]}
      meta={[
        { label: { en: 'Equipment ID', ar: 'معرّف المعدة' }, value: equipmentId },
        ...(lpId ? [{ label: { en: 'LP_ID', ar: 'LP_ID' }, value: lpId }] : []),
      ]}
    />
  );
}

export function SampleReportPlaceholder({ locale }: { locale: string }): React.ReactElement {
  const [params] = useSearchParams();
  const equipmentId = params.get('equipment') ?? '';
  const lpId = params.get('lp') ?? '';

  return (
    <OaRoutePlaceholder
      locale={locale}
      title={{ en: 'Oil Sample Report', ar: 'تقرير عينة الزيت' }}
      subtitle={{
        en: 'Engineering oil analysis report — OA-003 placeholder.',
        ar: 'تقرير تحليل الزيت الهندسي — عنصر نائب OA-003.',
      }}
      breadcrumbs={[
        { en: 'Oil Analysis', ar: 'تحليل الزيت' },
        { en: 'Equipment & LP Register', ar: 'سجل المعدات ونقاط التشحيم' },
        { en: 'Oil Sample Report', ar: 'تقرير عينة الزيت' },
      ]}
      meta={[
        { label: { en: 'Equipment ID', ar: 'معرّف المعدة' }, value: equipmentId || '—' },
        { label: { en: 'LP_ID', ar: 'LP_ID' }, value: lpId || '—' },
      ]}
    />
  );
}
