// apps/owner-center/src/context/TourContext.tsx
// Guide Tour context and provider for the Owner Center shell.
//
// Manages the runtime state of the active guided tour.
// No overlay is rendered yet — this context is a foundation stub that tracks
// which tour is active and at which step.  The guided-overlay component
// will be added in a future milestone and will consume useTour().

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { TourContextValue } from '../types/app-types';
import type { GuideTourId } from '../types/tour-types';
import { INITIAL_TOUR_STATE } from '../types/tour-types';

const TourContext = createContext<TourContextValue | null>(null);

/** Wraps the application with guided-tour state. No tour is active by default. */
export function TourProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [tourState, setTourState] = useState(INITIAL_TOUR_STATE);

  const startTour = useCallback((tourId: GuideTourId): void => {
    setTourState(prev => {
      if (prev.isActive) return prev;
      return { activeTourId: tourId, currentStepIndex: 0, isActive: true };
    });
  }, []);

  const endTour = useCallback((): void => {
    setTourState(INITIAL_TOUR_STATE);
  }, []);

  return (
    <TourContext.Provider value={{ tourState, startTour, endTour }}>
      {children}
    </TourContext.Provider>
  );
}

/** Returns the current tour context. Must be called inside TourProvider. */
export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (ctx === null) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}
