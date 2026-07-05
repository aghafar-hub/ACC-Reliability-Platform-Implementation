// apps/owner-center/src/components/ui/hooks/useBreakpoint.ts
// Responsive breakpoint hook aligned with platform mobile standards.

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const QUERIES: Record<Breakpoint, string> = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
};

function resolveBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(QUERIES.mobile).matches) return 'mobile';
  if (window.matchMedia(QUERIES.tablet).matches) return 'tablet';
  return 'desktop';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(resolveBreakpoint);

  useEffect(() => {
    const media = [
      window.matchMedia(QUERIES.mobile),
      window.matchMedia(QUERIES.tablet),
      window.matchMedia(QUERIES.desktop),
    ];

    const update = (): void => setBreakpoint(resolveBreakpoint());
    media.forEach((m) => m.addEventListener('change', update));
    return () => media.forEach((m) => m.removeEventListener('change', update));
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile';
}
