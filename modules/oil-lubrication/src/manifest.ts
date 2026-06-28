// modules/oil-lubrication/src/manifest.ts
// Module manifest and service factory for the Oil Lubrication module.
//
// OIL_LUBRICATION_MANIFEST — static descriptor read by the Module Manager
//   at platform startup (PS-114 §16).
//
// createOilLubricationService — wires the IRepository from the Platform SDK
//   into the domain repository adapter and returns the configured service.

import type { ModuleManifest, IPlatformSdk, ILogger } from '@acc-reliability/sdk';
import { OilLubricationRepository, OIL_CHANGE_RECORD_ENTITY_TYPE } from './oil-lubrication.repository';
import { OilLubricationService } from './oil-lubrication.service';
import type { OilChangeRecord } from './types';

// ── Module manifest ───────────────────────────────────────────────────────────

/**
 * Static descriptor for the Oil Lubrication module.
 *
 * Register this manifest with the Module Manager during platform
 * initialization.  The `moduleId` value is the stable key used in permission
 * checks, audit records, and Module Registry lookups.
 */
export const OIL_LUBRICATION_MANIFEST: ModuleManifest = {
  moduleId: 'oil-lubrication',
  displayName: 'Oil Lubrication',
  version: '1.0.0',
  requiredPlatformVersion: '0.1.0',
  requiredSdkVersion: '0.1.0',
  description: 'Manages oil change records and lubrication point tracking for equipment.',
} as const;

// ── Service factory ───────────────────────────────────────────────────────────

/**
 * Creates a fully wired {@link OilLubricationService}.
 *
 * The contractor scope is embedded in the repository instance obtained from
 * `sdk.storage.getRepository`; callers do not pass contractor ids to the
 * service methods.
 *
 * @param sdk    Platform SDK for the current session.
 * @param logger Logger pre-configured for the oil-lubrication module.
 */
export function createOilLubricationService(
  sdk: IPlatformSdk,
  logger: ILogger
): OilLubricationService {
  const inner = sdk.storage.getRepository<OilChangeRecord>(OIL_CHANGE_RECORD_ENTITY_TYPE);
  const repo = new OilLubricationRepository(inner);
  return new OilLubricationService(repo, logger);
}
