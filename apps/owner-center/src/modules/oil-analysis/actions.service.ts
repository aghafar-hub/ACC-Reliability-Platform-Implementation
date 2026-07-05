// OA-005 — Oil Analysis Actions adapter (Source = Oil Analysis only).

import type { OilAnalysisContractorScope } from './contractor-scope';
import {
  engineeringActionService,
  type EngineeringActionFilterParams,
} from '../platform/engineering-actions/engineering-action.service';
import type {
  EngineeringAction,
  EngineeringActionCreateInput,
  EngineeringActionUpdateInput,
  FastActionSubmitInput,
} from '../platform/engineering-actions/engineering-action-types';
import { lpRegisterService } from './lp-register.service';
import { getPlatformSdk } from '../platform/platform-master-access';

const OIL_ANALYSIS_SOURCE = 'Oil Analysis' as const;

export interface OilAnalysisActionFilterParams {
  readonly search?: string;
  readonly lpId?: string;
  readonly status?: EngineeringActionFilterParams['status'];
  readonly priority?: EngineeringActionFilterParams['priority'];
  readonly assignedTo?: string;
  readonly dueDate?: string;
}

export interface OilAnalysisActionListRow {
  readonly id: string;
  readonly actionNo: string;
  readonly lpId: string;
  readonly equipmentName: string;
  readonly sampleId: string;
  readonly priority: EngineeringAction['priority'];
  readonly status: EngineeringAction['status'];
  readonly contractorName: string;
  readonly assignedTo: string;
  readonly dueDate: string | null;
  readonly updatedAt: string;
}

export interface OilAnalysisActionListView {
  readonly rows: readonly OilAnalysisActionListRow[];
  readonly filterOptions: {
    readonly lpIds: readonly string[];
    readonly statuses: readonly EngineeringAction['status'][];
    readonly priorities: readonly string[];
    readonly assignees: readonly string[];
  };
  readonly kpis: {
    readonly total: number;
    readonly open: number;
    readonly critical: number;
    readonly overdue: number;
    readonly pendingAccReview: number;
  };
}

function applyContractorFilter(
  scope: OilAnalysisContractorScope,
): string | undefined {
  if (!scope.canViewAllContractors) return scope.lockedContractorId;
  return undefined;
}

function toPlatformParams(
  scope: OilAnalysisContractorScope,
  params: OilAnalysisActionFilterParams = {},
): EngineeringActionFilterParams {
  return {
    search: params.search,
    source: OIL_ANALYSIS_SOURCE,
    lpId: params.lpId,
    status: params.status,
    priority: params.priority,
    assignedTo: params.assignedTo,
    dueDate: params.dueDate,
    contractorId: applyContractorFilter(scope),
  };
}

function toListRow(action: EngineeringAction): OilAnalysisActionListRow {
  return {
    id: action.id,
    actionNo: action.actionNo,
    lpId: action.lpId,
    equipmentName: action.equipmentName,
    sampleId: action.sampleId,
    priority: action.priority,
    status: action.status,
    contractorName: action.contractorName,
    assignedTo: action.assignedTo,
    dueDate: action.dueDate,
    updatedAt: action.updatedAt,
  };
}

export function resolveCanSubmitFastAction(scope: OilAnalysisContractorScope): boolean {
  if (scope.canViewAllContractors) return false;
  const sdk = getPlatformSdk();
  return sdk.permissions.hasPermission({
    moduleId: 'oil-analysis',
    action: 'create',
    contractorScope: sdk.context.currentUser.contractorId,
  });
}

export function resolveCanEditAction(scope: OilAnalysisContractorScope): boolean {
  const sdk = getPlatformSdk();
  const contractorScope = sdk.context.currentUser.contractorId;
  return (
    sdk.permissions.hasPermission({
      moduleId: 'oil-analysis',
      action: 'update',
      contractorScope,
    }) ||
    sdk.permissions.hasPermission({
      moduleId: 'oil-analysis',
      action: 'approve',
      contractorScope: scope.canViewAllContractors ? 'all' : contractorScope,
    })
  );
}

export class OilAnalysisActionsService {
  list(
    scope: OilAnalysisContractorScope,
    params: OilAnalysisActionFilterParams = {},
  ): OilAnalysisActionListView {
    const platformParams = toPlatformParams(scope, params);
    const actions = engineeringActionService.listLatestByLp(platformParams);
    const meta = engineeringActionService.computeListMeta(platformParams);

    return {
      rows: actions.map(toListRow),
      filterOptions: meta.filterOptions,
      kpis: meta.kpis,
    };
  }

  findById(scope: OilAnalysisContractorScope, actionId: string): EngineeringAction | null {
    const action = engineeringActionService.findById(actionId);
    if (!action || action.source !== OIL_ANALYSIS_SOURCE) return null;

    const contractorFilter = applyContractorFilter(scope);
    if (contractorFilter && action.contractorId !== contractorFilter) return null;
    return action;
  }

  listLpOptions(scope: OilAnalysisContractorScope): readonly { lpId: string; label: string }[] {
    return lpRegisterService.list(scope).map((row) => ({
      lpId: row.lpId,
      label: `${row.lpId} — ${row.equipmentName}`,
    }));
  }

  create(
    scope: OilAnalysisContractorScope,
    input: Omit<EngineeringActionCreateInput, 'source'>,
    actor: string,
  ): EngineeringAction {
    const contractorFilter = applyContractorFilter(scope);
    if (contractorFilter && input.contractorId !== contractorFilter) {
      throw new Error('Contractor isolation violation');
    }
    return engineeringActionService.create(
      { ...input, source: OIL_ANALYSIS_SOURCE },
      actor,
    );
  }

  update(
    scope: OilAnalysisContractorScope,
    actionId: string,
    changes: EngineeringActionUpdateInput,
    actor: string,
    actorRole?: string,
  ): EngineeringAction {
    const existing = this.findById(scope, actionId);
    if (!existing) throw new Error('Action not found or access denied');
    return engineeringActionService.update(actionId, changes, actor, actorRole);
  }

  submitFastAction(
    scope: OilAnalysisContractorScope,
    input: Omit<FastActionSubmitInput, 'source' | 'contractorId' | 'actor' | 'actorRole' | 'actorCompany'>,
    actor: string,
    actorRole?: string,
    actorCompany?: string,
  ): EngineeringAction {
    if (!resolveCanSubmitFastAction(scope)) {
      throw new Error('Fast Action is not permitted for this user');
    }

    const sdk = getPlatformSdk();
    const lpRow = lpRegisterService.list(scope).find((row) => row.lpId === input.lpId);
    if (!lpRow) throw new Error('LP not found in contractor scope');

    return engineeringActionService.submitFastAction({
      ...input,
      source: OIL_ANALYSIS_SOURCE,
      contractorId: scope.lockedContractorId,
      equipmentId: lpRow.equipmentId,
      equipmentName: lpRow.equipmentName,
      actor,
      actorRole,
      actorCompany: actorCompany ?? lpRow.contractorId,
    });
  }

  countOpen(scope: OilAnalysisContractorScope): number {
    return engineeringActionService.countOpen(toPlatformParams(scope));
  }
}

export const oilAnalysisActionsService = new OilAnalysisActionsService();

export {
  actionStatusBadge,
  priorityBadgeVariant,
} from '../platform/engineering-actions/action-status';
