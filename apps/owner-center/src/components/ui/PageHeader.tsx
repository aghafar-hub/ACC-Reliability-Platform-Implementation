// apps/owner-center/src/components/ui/PageHeader.tsx
// Module page header with breadcrumbs, title, status, and actions.

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { cn } from './types';
import type { BreadcrumbItem, StatusBadgeVariant } from './types';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  status?: { variant: StatusBadgeVariant; label: string };
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  status,
  actions,
  className,
}: PageHeaderProps): React.ReactElement {
  return (
    <header className={cn('acc-page-header', className)}>
      <div className="acc-page-header__main">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="acc-page-header__breadcrumbs" aria-label="Breadcrumb">
            <ol className="acc-page-header__breadcrumb-list">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <li key={`${item.label}-${index}`} className="acc-page-header__breadcrumb-item">
                    {!isLast && (item.href || item.onClick) ? (
                      item.href ? (
                        <a href={item.href} className="acc-page-header__breadcrumb-link">
                          {item.label}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="acc-page-header__breadcrumb-link"
                          onClick={item.onClick}
                        >
                          {item.label}
                        </button>
                      )
                    ) : (
                      <span
                        className="acc-page-header__breadcrumb-current"
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {item.label}
                      </span>
                    )}
                    {!isLast && (
                      <span className="acc-page-header__breadcrumb-sep" aria-hidden="true">
                        /
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div className="acc-page-header__title-row">
          <div className="acc-page-header__text">
            <h1 className="acc-page-header__title">{title}</h1>
            {subtitle && <p className="acc-page-header__subtitle">{subtitle}</p>}
          </div>
          {status && (
            <StatusBadge
              variant={status.variant}
              label={status.label}
              className="acc-page-header__status"
            />
          )}
        </div>
      </div>

      {actions && <div className="acc-page-header__actions">{actions}</div>}
    </header>
  );
}
