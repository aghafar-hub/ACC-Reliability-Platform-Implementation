// apps/owner-center/src/components/UserMenu.tsx
// Header user menu — placeholder until the auth milestone wires a real user.
// No API calls, no auth dependency. Avatar initial and display name are static.

import React from 'react';
import type { LocaleCode } from '../types/app-types';

interface UserMenuProps {
  readonly locale: LocaleCode;
}

const COPY = {
  ariaLabel: { en: 'User menu',  ar: 'قائمة المستخدم' },
  name:      { en: 'Owner',      ar: 'المالك'          },
} as const;

export function UserMenu({ locale }: UserMenuProps): React.ReactElement {
  const isAr = locale === 'ar';

  return (
    <div
      className="user-menu"
      aria-label={isAr ? COPY.ariaLabel.ar : COPY.ariaLabel.en}
    >
      <span className="user-menu__avatar" aria-hidden="true">O</span>
      <span className="user-menu__name">
        {isAr ? COPY.name.ar : COPY.name.en}
      </span>
    </div>
  );
}
