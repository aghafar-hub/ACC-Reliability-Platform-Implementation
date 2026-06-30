// apps/owner-center/src/components/SectionCard.tsx
// Shared enterprise section card — Card System v2.
// Renders an icon badge derived from the English title, a translated
// title + description, and a disabled CTA button.
// No business logic, no API calls.

import React from 'react';

// ── Icon derivation ───────────────────────────────────────────────────────────

function getInitials(titleEn: string): string {
  const words = titleEn.trim().split(/[\s\/\-&+]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return '??';
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SectionCardProps {
  /** English title used only for icon initials derivation. */
  titleEn: string;
  /** Translated display title. */
  title: string;
  /** Translated description text. */
  description: string;
  /** Translated CTA label (always disabled / "Coming soon"). */
  cta: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SectionCard({
  titleEn,
  title,
  description,
  cta,
}: SectionCardProps): React.ReactElement {
  const initials = getInitials(titleEn);

  return (
    <div className="ur-section-card">
      <div className="ur-section-card__body">
        <div className="ur-section-card__icon" aria-hidden="true">
          {initials}
        </div>
        <h3 className="ur-section-card__title">{title}</h3>
        <p className="ur-section-card__desc">{description}</p>
      </div>
      <button type="button" className="ur-section-card__cta" disabled>
        {cta}
      </button>
    </div>
  );
}
