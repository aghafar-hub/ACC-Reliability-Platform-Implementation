// apps/owner-center/src/components/Breadcrumb.tsx
// Route-aware breadcrumb rendered above each module page.
// Derives its label from NAV_ITEMS — no API calls, no business data.
// Returns null on the home route so the dashboard has no breadcrumb.

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../types/navigation-types';
import type { LocaleCode } from '../types/app-types';

interface BreadcrumbProps {
  readonly locale: LocaleCode;
}

export function Breadcrumb({ locale }: BreadcrumbProps): React.ReactElement | null {
  const { pathname } = useLocation();
  const isAr = locale === 'ar';

  const homeItem = NAV_ITEMS.find((item) => item.end === true);

  const currentItem = NAV_ITEMS.find(
    (item) => item.end !== true && pathname.startsWith(item.path),
  );

  if (currentItem === undefined) return null;

  const separator = isAr ? '‹' : '›';

  return (
    <nav
      className="breadcrumb"
      aria-label={isAr ? 'مسار التنقل' : 'Breadcrumb'}
    >
      <ol className="breadcrumb__list">
        {homeItem !== undefined && (
          <li className="breadcrumb__item">
            <Link to="/" className="breadcrumb__link">
              {isAr ? homeItem.label.ar : homeItem.label.en}
            </Link>
          </li>
        )}
        <li className="breadcrumb__separator" aria-hidden="true">
          {separator}
        </li>
        <li
          className="breadcrumb__item breadcrumb__item--current"
          aria-current="page"
        >
          {isAr ? currentItem.label.ar : currentItem.label.en}
        </li>
      </ol>
    </nav>
  );
}
