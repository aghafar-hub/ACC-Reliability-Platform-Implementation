// Platform Engineering Actions — localStorage-backed service (TEMPORARY).
// React components MUST NOT access localStorage directly; they call this service.
//
// Backend gap: replace EngineeringActionLocalRepository with Apps Script / Sheets
// persistence when the Engineering Actions API is available.

import { getPlatformSdk } from '../platform-master-access';
import { lpRegisterService } from '../../oil-analysis/lp-register.service';
import { resolveOilAnalysisContractorScope } from '../../oil-analysis/contractor-scope';
import { oilSampleService, computeSampleCondition } from '../../oil-analysis/sample.service';
import { detectOilChangeRequirement } from './action-status';
import type {
  EngineeringAction,
  EngineeringActionComment,
  EngineeringActionCreateInput,
  EngineeringActionFilterParams,
  EngineeringActionHistoryEntry,
  EngineeringActionSource,
  EngineeringActionStatus,
  EngineeringActionUpdateInput,
  FastActionSubmitInput,
} from './engineering-action-types';

const STORAGE_KEY = 'acc.engineering-actions.v1';

function isoNow(): string {
  return new Date().toISOString();
}

function generateInternalId(): string {
  return `ea-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateHistoryId(): string {
  return `eah-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveOilType(lpId: string): string {
  const lp = getPlatformSdk().lubricationPoints.findByLpId(lpId);
  return lp?.lubricant?.trim() || '—';
}

function resolveContractorName(contractorId: string): string {
  const result = getPlatformSdk().contractors.list({ limit: 500 });
  const match = result.contractors.find(
    (c) => c.contractorCode === contractorId || String(c.id) === contractorId,
  );
  return match?.name?.trim() || contractorId;
}

function appendHistory(
  action: EngineeringAction,
  entry: Omit<EngineeringActionHistoryEntry, 'id' | 'timestamp'>,
): EngineeringActionHistoryEntry[] {
  return [
    ...action.history,
    {
      id: generateHistoryId(),
      timestamp: isoNow(),
      ...entry,
    },
  ];
}

function matchesSearch(action: EngineeringAction, query: string): boolean {
  const haystack = [
    action.actionNo,
    action.lpId,
    action.sampleId,
    action.equipmentId,
    action.equipmentName,
    action.contractorName,
    action.contractorAction,
    action.accAction,
    action.meetingAction,
    action.assignedTo,
    action.status,
    action.priority,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function matchesFilters(
  action: EngineeringAction,
  params: EngineeringActionFilterParams,
): boolean {
  const search = params.search?.trim().toLowerCase() ?? '';
  if (search && !matchesSearch(action, search)) return false;
  if (params.source && action.source !== params.source) return false;
  if (params.lpId && action.lpId !== params.lpId) return false;
  if (params.sampleId && action.sampleId !== params.sampleId) return false;
  if (params.status && action.status !== params.status) return false;
  if (params.priority && action.priority !== params.priority) return false;
  if (params.assignedTo && action.assignedTo !== params.assignedTo) return false;
  if (params.dueDate && action.dueDate !== params.dueDate) return false;
  if (params.contractorId && action.contractorId !== params.contractorId) return false;
  return true;
}

function normalizeRow(raw: Partial<EngineeringAction> & { id: string; actionNo: string }): EngineeringAction {
  return {
    id: raw.id,
    actionNo: raw.actionNo,
    source: raw.source ?? 'Oil Analysis',
    lpId: raw.lpId ?? '',
    sampleId: raw.sampleId ?? '',
    equipmentId: raw.equipmentId ?? '',
    equipmentName: raw.equipmentName ?? '',
    oilType: raw.oilType ?? '—',
    contractorId: raw.contractorId ?? '',
    contractorName: raw.contractorName ?? raw.contractorId ?? '',
    contractorAction: raw.contractorAction ?? '',
    accAction: raw.accAction ?? '',
    meetingAction: raw.meetingAction ?? '',
    assignedTo: raw.assignedTo ?? '',
    dueDate: raw.dueDate ?? null,
    priority: raw.priority ?? 'Medium',
    status: raw.status ?? 'Draft',
    contractorComment: raw.contractorComment ?? '',
    accComment: raw.accComment ?? '',
    meetingComment: raw.meetingComment ?? '',
    generalComment: raw.generalComment ?? '',
    commentThread: raw.commentThread ?? [],
    history: raw.history ?? [],
    requiresOilLubricationTask: raw.requiresOilLubricationTask ?? false,
    oilLubricationTaskDispatched: raw.oilLubricationTaskDispatched ?? false,
    fastActionPendingAccReview: raw.fastActionPendingAccReview ?? false,
    createdAt: raw.createdAt ?? isoNow(),
    updatedAt: raw.updatedAt ?? isoNow(),
    createdBy: raw.createdBy ?? 'System',
  };
}

class EngineeringActionLocalRepository {
  private cache: EngineeringAction[] | null = null;

  private readFromStorage(): EngineeringAction[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Partial<EngineeringAction>[];
      return parsed.map((row) =>
        normalizeRow({
          ...row,
          id: String(row.id),
          actionNo: String(row.actionNo),
        }),
      );
    } catch {
      return [];
    }
  }

  private writeToStorage(): void {
    if (typeof window === 'undefined' || this.cache === null) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
  }

  list(): readonly EngineeringAction[] {
    if (this.cache === null) {
      this.cache = this.readFromStorage();
      if (this.cache.length === 0) {
        this.cache = buildSeedActions();
        this.writeToStorage();
      }
    }
    return this.cache;
  }

  findById(id: string): EngineeringAction | null {
    return this.list().find((row) => row.id === id) ?? null;
  }

  save(row: EngineeringAction): EngineeringAction {
    const rows = [...this.list()];
    const index = rows.findIndex((r) => r.id === row.id);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    this.cache = rows;
    this.writeToStorage();
    return row;
  }

  nextActionNo(): string {
    const year = new Date().getFullYear();
    const prefix = `EA-${year}-`;
    const existing = this.list()
      .map((row) => row.actionNo)
      .filter((no) => no.startsWith(prefix));
    const maxSeq = existing.reduce((max, no) => {
      const seq = Number.parseInt(no.slice(prefix.length), 10);
      return Number.isFinite(seq) ? Math.max(max, seq) : max;
    }, 0);
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}

function buildSeedActions(): EngineeringAction[] {
  const sdk = getPlatformSdk();
  const scope = resolveOilAnalysisContractorScope(sdk);
  const rows = lpRegisterService.list(scope).slice(0, 6);
  const samples = oilSampleService.list();
  const now = isoNow();
  const due = todayDateString();

  const statuses: EngineeringActionStatus[] = [
    'Open',
    'Assigned',
    'In Progress',
    'Draft',
    'Waiting Shutdown',
    'Completed',
  ];
  const priorities = ['Critical', 'High', 'Medium', 'Low', 'High', 'Medium'] as const;

  return rows.map((row, index) => {
    const sample =
      samples
        .filter((s) => s.lubricationPointId === row.lpId)
        .sort((a, b) => b.sampledAt.localeCompare(a.sampledAt))[0] ?? null;
    const condition = sample ? computeSampleCondition(sample) : null;
    const id = generateInternalId();
    const actionNo = `EA-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`;
    const meetingAction =
      index === 2 ? 'Schedule Oil Change within 30 days' : index === 0 ? 'Investigate wear metals' : '';

    return normalizeRow({
      id,
      actionNo,
      source: 'Oil Analysis',
      lpId: row.lpId,
      sampleId: sample?.sampleId ?? '',
      equipmentId: row.equipmentId,
      equipmentName: row.equipmentName,
      oilType: resolveOilType(row.lpId),
      contractorId: row.contractorId,
      contractorName: resolveContractorName(row.contractorId),
      contractorAction: condition === 'critical' ? 'Shutdown Required' : 'Monitor',
      accAction: index % 2 === 0 ? 'Investigate' : '',
      meetingAction,
      assignedTo: index % 2 === 0 ? 'Reliability Engineer' : '',
      dueDate: due,
      priority: priorities[index] ?? 'Medium',
      status: statuses[index] ?? 'Open',
      contractorComment: index === 1 ? 'Observed elevated iron on last sample.' : '',
      accComment: '',
      meetingComment: '',
      generalComment: '',
      commentThread:
        index === 0
          ? [
              {
                id: generateHistoryId(),
                user: 'Contractor Engineer',
                company: row.contractorId,
                role: 'Contractor Engineer',
                timestamp: now,
                text: 'Please review latest alert sample.',
              },
            ]
          : [],
      history: [
        {
          id: generateHistoryId(),
          timestamp: now,
          actor: 'System',
          summary: 'Action seeded for UI development',
          details: 'Temporary localStorage seed — replace with backend persistence.',
        },
      ],
      requiresOilLubricationTask: detectOilChangeRequirement(meetingAction),
      oilLubricationTaskDispatched: false,
      fastActionPendingAccReview: false,
      createdAt: now,
      updatedAt: now,
      createdBy: 'System',
    });
  });
}

export interface EngineeringActionListResult {
  readonly rows: readonly EngineeringAction[];
  readonly latestByLp: readonly EngineeringAction[];
  readonly filterOptions: {
    readonly lpIds: readonly string[];
    readonly statuses: readonly EngineeringActionStatus[];
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

export class EngineeringActionService {
  constructor(private readonly repo = new EngineeringActionLocalRepository()) {}

  list(params: EngineeringActionFilterParams = {}): readonly EngineeringAction[] {
    return this.repo
      .list()
      .filter((row) => matchesFilters(row, params))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listLatestByLp(params: EngineeringActionFilterParams = {}): readonly EngineeringAction[] {
    const filtered = this.list(params);
    const byLp = new Map<string, EngineeringAction>();
    for (const row of filtered) {
      const existing = byLp.get(row.lpId);
      if (!existing || row.updatedAt.localeCompare(existing.updatedAt) > 0) {
        byLp.set(row.lpId, row);
      }
    }
    return [...byLp.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  findById(id: string): EngineeringAction | null {
    return this.repo.findById(id);
  }

  getFilterOptions(
    params: EngineeringActionFilterParams = {},
  ): EngineeringActionListResult['filterOptions'] {
    const rows = this.list(params);
    const distinct = (values: readonly string[]): string[] =>
      [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

    return {
      lpIds: distinct(rows.map((r) => r.lpId)),
      statuses: distinct(rows.map((r) => r.status)) as EngineeringActionStatus[],
      priorities: distinct(rows.map((r) => r.priority)),
      assignees: distinct(rows.map((r) => r.assignedTo)),
    };
  }

  computeListMeta(
    params: EngineeringActionFilterParams = {},
  ): Pick<EngineeringActionListResult, 'kpis' | 'filterOptions'> {
    const rows = this.list(params);
    const latestByLp = this.listLatestByLp(params);
    const today = todayDateString();

    return {
      filterOptions: this.getFilterOptions(params),
      kpis: {
        total: latestByLp.length,
        open: latestByLp.filter((r) => !['Completed', 'Verified', 'Closed'].includes(r.status)).length,
        critical: latestByLp.filter((r) => r.priority === 'Critical').length,
        overdue: latestByLp.filter((r) => r.dueDate !== null && r.dueDate < today && !['Completed', 'Verified', 'Closed'].includes(r.status)).length,
        pendingAccReview: rows.filter((r) => r.fastActionPendingAccReview).length,
      },
    };
  }

  create(input: EngineeringActionCreateInput, actor: string): EngineeringAction {
    const now = isoNow();
    const meetingAction = input.meetingAction?.trim() ?? '';
    const row = normalizeRow({
      id: generateInternalId(),
      actionNo: this.repo.nextActionNo(),
      source: input.source,
      lpId: input.lpId,
      sampleId: input.sampleId ?? '',
      equipmentId: input.equipmentId,
      equipmentName: input.equipmentName,
      oilType: input.oilType ?? resolveOilType(input.lpId),
      contractorId: input.contractorId,
      contractorName: input.contractorName ?? resolveContractorName(input.contractorId),
      contractorAction: input.contractorAction ?? '',
      accAction: input.accAction ?? '',
      meetingAction,
      assignedTo: input.assignedTo ?? '',
      dueDate: input.dueDate ?? null,
      priority: input.priority ?? 'Medium',
      status: input.status ?? 'Draft',
      contractorComment: input.contractorComment ?? '',
      accComment: input.accComment ?? '',
      meetingComment: input.meetingComment ?? '',
      generalComment: input.generalComment ?? '',
      commentThread: [],
      history: [
        {
          id: generateHistoryId(),
          timestamp: now,
          actor,
          summary: 'Action created',
          newStatus: input.status ?? 'Draft',
        },
      ],
      requiresOilLubricationTask:
        input.requiresOilLubricationTask ?? detectOilChangeRequirement(meetingAction),
      oilLubricationTaskDispatched: false,
      fastActionPendingAccReview: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
    });
    return this.repo.save(row);
  }

  update(
    id: string,
    changes: EngineeringActionUpdateInput,
    actor: string,
    actorRole?: string,
  ): EngineeringAction {
    const existing = this.repo.findById(id);
    if (!existing) throw new Error(`Engineering action not found: ${id}`);

    const now = isoNow();
    const nextMeeting = changes.meetingAction ?? existing.meetingAction;
    const nextStatus = changes.status ?? existing.status;
    const history = appendHistory(existing, {
      actor,
      actorRole,
      summary: 'Action updated',
      details: Object.keys(changes).join(', '),
      previousStatus: changes.status ? existing.status : undefined,
      newStatus: changes.status,
    });

    let oilLubricationTaskDispatched = existing.oilLubricationTaskDispatched;
    let requiresOilLubricationTask =
      changes.requiresOilLubricationTask ??
      (detectOilChangeRequirement(nextMeeting) || existing.requiresOilLubricationTask);

    if (changes.meetingActionAccepted && requiresOilLubricationTask && !oilLubricationTaskDispatched) {
      // Placeholder — Oil Lubrication task creation not implemented yet.
      oilLubricationTaskDispatched = false;
      history.push({
        id: generateHistoryId(),
        timestamp: now,
        actor,
        actorRole,
        summary: 'Oil Lubrication task dispatch queued (placeholder)',
        details:
          'Meeting action requires oil change — backend will create Oil Lubrication task when integration is available.',
        notificationPending: true,
      });
    }

    if (detectOilChangeRequirement(nextMeeting)) {
      requiresOilLubricationTask = true;
    }

    const updated = normalizeRow({
      ...existing,
      ...changes,
      meetingAction: nextMeeting,
      status: nextStatus,
      requiresOilLubricationTask,
      oilLubricationTaskDispatched,
      history,
      updatedAt: now,
    });

    return this.repo.save(updated);
  }

  submitFastAction(input: FastActionSubmitInput): EngineeringAction {
    const now = isoNow();
    const existingForLp = [...this.list({
      source: input.source,
      lpId: input.lpId,
      contractorId: input.contractorId,
    })].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

    const baseHistory: EngineeringActionHistoryEntry[] = existingForLp
      ? [...existingForLp.history]
      : [];

    const historyEntry: EngineeringActionHistoryEntry = {
      id: generateHistoryId(),
      timestamp: now,
      actor: input.actor,
      actorRole: input.actorRole,
      summary: 'Fast Action submitted',
      details: `${input.actionType}: ${input.comment}`,
      newStatus: 'Open',
      notificationPending: true,
    };

    const comment: EngineeringActionComment = {
      id: generateHistoryId(),
      user: input.actor,
      company: input.actorCompany,
      role: input.actorRole,
      timestamp: now,
      text: input.comment,
    };

    if (existingForLp) {
      return this.repo.save(
        normalizeRow({
          ...existingForLp,
          contractorAction: input.actionType,
          contractorComment: input.comment,
          dueDate: input.dueDate,
          status: 'Open',
          priority: existingForLp.priority === 'Low' ? 'High' : existingForLp.priority,
          fastActionPendingAccReview: true,
          commentThread: [...existingForLp.commentThread, comment],
          history: [...baseHistory, historyEntry],
          updatedAt: now,
        }),
      );
    }

    return this.create(
      {
        source: input.source,
        lpId: input.lpId,
        sampleId: input.sampleId,
        equipmentId: input.equipmentId ?? '',
        equipmentName: input.equipmentName ?? input.lpId,
        oilType: input.oilType,
        contractorId: input.contractorId,
        contractorAction: input.actionType,
        contractorComment: input.comment,
        dueDate: input.dueDate,
        priority: 'High',
        status: 'Open',
      },
      input.actor,
    );
  }

  addComment(
    actionId: string,
    comment: Omit<EngineeringActionComment, 'id'>,
  ): EngineeringAction {
    const existing = this.repo.findById(actionId);
    if (!existing) throw new Error(`Engineering action not found: ${actionId}`);

    const now = isoNow();
    const entry: EngineeringActionComment = {
      id: generateHistoryId(),
      ...comment,
      timestamp: comment.timestamp || now,
    };

    return this.repo.save(
      normalizeRow({
        ...existing,
        commentThread: [...existing.commentThread, entry],
        history: appendHistory(existing, {
          actor: comment.user,
          actorRole: comment.role,
          summary: 'Comment added',
          details: comment.text.slice(0, 120),
        }),
        updatedAt: now,
      }),
    );
  }

  countOpen(params: EngineeringActionFilterParams = {}): number {
    return this.list(params).filter(
      (row) => !['Completed', 'Verified', 'Closed'].includes(row.status),
    ).length;
  }

  /** Future hook — draft actions from approved alert/caution samples (Add Sample workflow). */
  createDraftFromSample(
    source: EngineeringActionSource,
    sampleInternalId: string,
    actor: string,
  ): EngineeringAction | null {
    const sample = oilSampleService.findById(sampleInternalId);
    if (!sample) return null;

    const condition = computeSampleCondition(sample);
    if (condition !== 'critical' && condition !== 'caution' && condition !== 'monitor') {
      return null;
    }

    const duplicate = this.list({
      source,
      lpId: sample.lubricationPointId ?? '',
      sampleId: sample.sampleId,
    });
    if (duplicate.length > 0) return duplicate[0] ?? null;

    return this.create(
      {
        source,
        lpId: sample.lubricationPointId ?? '',
        sampleId: sample.sampleId,
        equipmentId: sample.equipmentId,
        equipmentName: sample.equipmentId,
        contractorId: sample.contractorId,
        priority: condition === 'critical' ? 'Critical' : 'High',
        status: 'Draft',
        generalComment: `Auto-draft from ${condition} sample ${sample.sampleId}`,
      },
      actor,
    );
  }
}

export const engineeringActionService = new EngineeringActionService();

export type { EngineeringActionFilterParams, EngineeringActionSource };
