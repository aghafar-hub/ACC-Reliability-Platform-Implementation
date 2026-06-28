// platform/shared-types/src/result.ts
// Standard service result envelope for the ACC Reliability Platform.
//
// Every platform operation that can fail returns ServiceResult<T> so that
// callers handle success and error cases explicitly without relying on
// exceptions crossing module boundaries.
//
// Design: discriminated union on the `ok` field keeps narrowing simple.

/** Successful result carrying a value of type T. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failed result carrying an error code, human-readable message, and optional correlation id. */
export interface Err {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
  readonly correlationId?: string | undefined;
}

/** Discriminated union returned by all fallible platform operations. */
export type ServiceResult<T> = Ok<T> | Err;

/** Constructs a successful {@link ServiceResult}. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Constructs a failed {@link ServiceResult}. */
export function err(
  code: string,
  message: string,
  correlationId?: string,
): Err {
  const base: { ok: false; code: string; message: string } = { ok: false, code, message };
  if (correlationId !== undefined) {
    return { ...base, correlationId };
  }
  return base;
}

/** Type guard — narrows {@link ServiceResult} to {@link Ok}. */
export function isOk<T>(result: ServiceResult<T>): result is Ok<T> {
  return result.ok;
}

/** Type guard — narrows {@link ServiceResult} to {@link Err}. */
export function isErr<T>(result: ServiceResult<T>): result is Err {
  return !result.ok;
}
