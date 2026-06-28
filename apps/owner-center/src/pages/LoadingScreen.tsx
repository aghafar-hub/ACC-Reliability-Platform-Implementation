// apps/owner-center/src/pages/LoadingScreen.tsx
// Fullscreen loading indicator shown during Suspense fallback and bootstrap.

import React from 'react';

/** Displayed while a lazy-loaded module chunk or async operation is pending. */
export function LoadingScreen(): React.ReactElement {
  return (
    <div className="loading-screen" role="status" aria-label="Loading">
      <span>Loading…</span>
    </div>
  );
}
