// platform/sdk/src/impl/session-storage-auth-repository.ts
// Browser sessionStorage implementation of IAuthRepository.
//
// Behaviour:
//  - Session data is serialised as JSON and stored under SESSION_STORAGE_KEY.
//  - All operations are wrapped in try/catch so a full sessionStorage (quota
//    exceeded) or a browser that blocks storage access (private mode) never
//    propagates an exception to the caller.
//  - Sessions are tab-scoped: closing the browser tab clears them automatically.
//
// Use this implementation in browser environments; use InMemoryAuthRepository
// for server-side or test contexts.

import type { IAuthRepository, SessionData } from '@acc-reliability/services';

const SESSION_STORAGE_KEY = 'platform.auth.session';

/**
 * Browser-tab-scoped session store backed by `window.sessionStorage`.
 *
 * Sessions survive page reloads within the same tab but are cleared when the
 * tab is closed.  This is intentional: each session is tied to a single tab
 * lifecycle, preventing credential persistence across browser restarts.
 *
 * Remember-Me behavior (cross-restart persistence) requires a future
 * `LocalStorageAuthRepository` and is not part of this implementation.
 */
export class SessionStorageAuthRepository implements IAuthRepository {
  save(session: SessionData): void {
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // sessionStorage quota exceeded or access blocked — silently ignore.
    }
  }

  load(): SessionData | null {
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore — nothing to clear or access blocked.
    }
  }
}
