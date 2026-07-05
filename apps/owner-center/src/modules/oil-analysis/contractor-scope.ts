// apps/owner-center/src/modules/oil-analysis/contractor-scope.ts
// Contractor data scope for Oil Analysis screens — enforces isolation at query layer.

import type { IPlatformSdk, ModuleId } from '@acc-reliability/sdk';

const OIL_ANALYSIS_MODULE_ID = 'oil-analysis' as ModuleId;

export interface OilAnalysisContractorScope {
  /** True when the user may view and filter across all contractors (ACC / AppOwner). */
  readonly canViewAllContractors: boolean;
  /** Contractor id locked for contractor-scoped users. */
  readonly lockedContractorId: string;
}

/** Resolves contractor visibility for Oil Analysis data queries. */
export function resolveOilAnalysisContractorScope(sdk: IPlatformSdk): OilAnalysisContractorScope {
  const canViewAllContractors = sdk.permissions.hasPermission({
    moduleId: OIL_ANALYSIS_MODULE_ID,
    action: 'read',
    contractorScope: 'all',
  });

  return {
    canViewAllContractors,
    lockedContractorId: String(sdk.context.currentUser.contractorId),
  };
}
