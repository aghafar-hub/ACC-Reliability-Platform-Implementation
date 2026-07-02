// apps/owner-center/src/hooks/useOilAnalysisPermissions.ts
// Memoized Oil Analysis action permissions — single source for UI enforcement.

import { useMemo } from 'react';
import type { ActionType, ModuleId } from '@acc-reliability/sdk';
import { useAuth } from '../context/AuthContext';
import { usePlatformSdk } from '../context/SdkContext';

export const OIL_ANALYSIS_MODULE_ID = 'oil-analysis' as ModuleId;

export const OIL_ANALYSIS_PERMISSION_DENIED = {
  en: 'Insufficient permissions for this action',
  ar: 'صلاحيات غير كافية لهذا الإجراء',
} as const;

export interface OilAnalysisPermissions {
  readonly canCreateSample: boolean;
  readonly canConfirmLpMapping: boolean;
  readonly canEnterLabResults: boolean;
  readonly canEngineerReview: boolean;
  readonly canApproveResults: boolean;
  readonly canExportReports: boolean;
  readonly canManageSettings: boolean;
}

const DENY_ALL: OilAnalysisPermissions = {
  canCreateSample: false,
  canConfirmLpMapping: false,
  canEnterLabResults: false,
  canEngineerReview: false,
  canApproveResults: false,
  canExportReports: false,
  canManageSettings: false,
};

function checkAction(
  has: (action: ActionType) => boolean,
): OilAnalysisPermissions {
  return {
    canCreateSample: has('create'),
    canConfirmLpMapping: has('update'),
    canEnterLabResults: has('update'),
    canEngineerReview: has('read') && has('approve'),
    canApproveResults: has('approve'),
    canExportReports: has('export'),
    canManageSettings: has('update'),
  };
}

/** Returns memoized Oil Analysis permission flags for the current session. */
export function useOilAnalysisPermissions(): OilAnalysisPermissions {
  const sdk = usePlatformSdk();
  const { status } = useAuth();

  return useMemo((): OilAnalysisPermissions => {
    if (status !== 'authenticated') return DENY_ALL;

    const contractorScope = sdk.context.currentUser.contractorId;
    const has = (action: ActionType): boolean =>
      sdk.permissions.hasPermission({
        moduleId: OIL_ANALYSIS_MODULE_ID,
        action,
        contractorScope,
      });

    return checkAction(has);
  }, [sdk, status]);
}
