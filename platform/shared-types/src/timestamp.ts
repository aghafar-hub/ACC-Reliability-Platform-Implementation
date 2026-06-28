// platform/shared-types/src/timestamp.ts
// ISO 8601 timestamp primitive for the ACC Reliability Platform.
//
// IsoTimestamp is a branded string so that bare `string` values cannot be
// silently passed as timestamps.  All platform date fields use this type.

/** Branded string representing an ISO 8601 UTC timestamp. */
export type IsoTimestamp = string & { readonly __brand: 'IsoTimestamp' };

/**
 * Creates an {@link IsoTimestamp} from a raw string.
 * @throws {Error} if value is blank.
 */
export function createIsoTimestamp(value: string): IsoTimestamp {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error('IsoTimestamp cannot be empty');
  return trimmed as IsoTimestamp;
}

/** Returns the current UTC time as an {@link IsoTimestamp}. */
export function nowIso(): IsoTimestamp {
  return new Date().toISOString() as IsoTimestamp;
}
