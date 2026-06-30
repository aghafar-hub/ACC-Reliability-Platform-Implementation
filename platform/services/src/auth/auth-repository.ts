// platform/services/src/auth/auth-repository.ts
// In-memory IAuthRepository — for non-browser and test environments.
//
// Holds at most one session at a time (the current active session).
// Thread safety: JavaScript is single-threaded; no additional locking needed.

import type { IAuthRepository, SessionData } from './auth-types';

/**
 * Non-persistent in-memory session store.
 *
 * Use in server-side environments, tests, and any context without access to
 * `sessionStorage`.  The session is lost when the process / test ends.
 *
 * For browser applications use `SessionStorageAuthRepository` from the SDK
 * package instead so the session survives hard page reloads within the same
 * browser tab.
 */
export class InMemoryAuthRepository implements IAuthRepository {
  private session: SessionData | null = null;

  save(session: SessionData): void {
    this.session = session;
  }

  load(): SessionData | null {
    return this.session;
  }

  clear(): void {
    this.session = null;
  }
}
