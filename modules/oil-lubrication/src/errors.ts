// modules/oil-lubrication/src/errors.ts
// Domain error hierarchy for the Oil Lubrication module.
//
// All errors extend PlatformError so they carry a machine-readable code,
// structured context, and ISO 8601 timestamp.  The `name` field on each
// subclass distinguishes specific error types when the code is shared.
//
// Error code prefix: OIL_LUBRICATION_  (reserved for this module)

import { PlatformError } from '@acc-reliability/sdk';

// ── Base domain error ─────────────────────────────────────────────────────────

/**
 * Base error for all Oil Lubrication module failures.
 *
 * Catch this type to handle any oil-lubrication error generically.
 * Catch specific subclasses for targeted recovery.
 */
export class OilLubricationError extends PlatformError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'OIL_LUBRICATION_ERROR', context);
    this.name = 'OilLubricationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Specific error types ──────────────────────────────────────────────────────

/**
 * Thrown when an oil change record cannot be found by id.
 */
export class OilRecordNotFoundError extends OilLubricationError {
  constructor(id: string, contractorId?: string) {
    super(
      `Oil change record not found: ${id}`,
      {
        id,
        ...(contractorId !== undefined ? { contractorId } : {}),
      }
    );
    this.name = 'OilRecordNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the input to create or update an oil change record is invalid.
 */
export class OilRecordValidationError extends OilLubricationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
    this.name = 'OilRecordValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
