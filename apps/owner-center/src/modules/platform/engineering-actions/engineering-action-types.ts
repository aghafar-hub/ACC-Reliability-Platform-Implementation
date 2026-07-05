// Platform Engineering Actions — shared data model (Main Platform, all modules).

/** Module source label stored on each action row. */
export type EngineeringActionSource =
  | 'Oil Analysis'
  | 'Oil Lubrication'
  | 'Vibration'
  | 'Reliability'
  | 'Inspection';

export type EngineeringActionPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type EngineeringActionStatus =
  | 'Draft'
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting Shutdown'
  | 'Completed'
  | 'Verified'
  | 'Closed';

export interface EngineeringActionComment {
  readonly id: string;
  readonly user: string;
  readonly company?: string;
  readonly role?: string;
  readonly timestamp: string;
  readonly text: string;
}

export interface EngineeringActionHistoryEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly actor: string;
  readonly actorRole?: string;
  readonly summary: string;
  readonly details?: string;
  readonly previousStatus?: EngineeringActionStatus;
  readonly newStatus?: EngineeringActionStatus;
  /** Placeholder audit flag — backend will persist to audit log. */
  readonly notificationPending?: boolean;
}

export interface EngineeringAction {
  readonly id: string;
  readonly actionNo: string;
  readonly source: EngineeringActionSource;
  readonly lpId: string;
  readonly sampleId: string;
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly oilType: string;
  readonly contractorId: string;
  readonly contractorName: string;
  readonly contractorAction: string;
  readonly accAction: string;
  readonly meetingAction: string;
  readonly assignedTo: string;
  readonly dueDate: string | null;
  readonly priority: EngineeringActionPriority;
  readonly status: EngineeringActionStatus;
  readonly contractorComment: string;
  readonly accComment: string;
  readonly meetingComment: string;
  readonly generalComment: string;
  readonly commentThread: readonly EngineeringActionComment[];
  readonly history: readonly EngineeringActionHistoryEntry[];
  /** Placeholder — future Oil Lubrication task dispatch when meeting action requires oil change. */
  readonly requiresOilLubricationTask: boolean;
  readonly oilLubricationTaskDispatched: boolean;
  readonly fastActionPendingAccReview: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
}

export interface EngineeringActionFilterParams {
  readonly search?: string;
  readonly source?: EngineeringActionSource;
  readonly lpId?: string;
  readonly sampleId?: string;
  readonly status?: EngineeringActionStatus;
  readonly priority?: EngineeringActionPriority;
  readonly assignedTo?: string;
  readonly dueDate?: string;
  readonly contractorId?: string;
}

export interface EngineeringActionCreateInput {
  readonly source: EngineeringActionSource;
  readonly lpId: string;
  readonly sampleId?: string;
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly oilType?: string;
  readonly contractorId: string;
  readonly contractorName?: string;
  readonly contractorAction?: string;
  readonly accAction?: string;
  readonly meetingAction?: string;
  readonly assignedTo?: string;
  readonly dueDate?: string | null;
  readonly priority?: EngineeringActionPriority;
  readonly status?: EngineeringActionStatus;
  readonly contractorComment?: string;
  readonly accComment?: string;
  readonly meetingComment?: string;
  readonly generalComment?: string;
  readonly requiresOilLubricationTask?: boolean;
}

export interface EngineeringActionUpdateInput {
  readonly lpId?: string;
  readonly contractorAction?: string;
  readonly accAction?: string;
  readonly meetingAction?: string;
  readonly assignedTo?: string;
  readonly dueDate?: string | null;
  readonly priority?: EngineeringActionPriority;
  readonly status?: EngineeringActionStatus;
  readonly contractorComment?: string;
  readonly accComment?: string;
  readonly meetingComment?: string;
  readonly generalComment?: string;
  readonly requiresOilLubricationTask?: boolean;
  readonly meetingActionAccepted?: boolean;
}

export interface FastActionSubmitInput {
  readonly lpId: string;
  readonly source: EngineeringActionSource;
  readonly actionType: string;
  readonly comment: string;
  readonly dueDate: string;
  readonly actor: string;
  readonly actorRole?: string;
  readonly actorCompany?: string;
  readonly contractorId: string;
  readonly equipmentId?: string;
  readonly equipmentName?: string;
  readonly oilType?: string;
  readonly sampleId?: string;
}

export const ENGINEERING_ACTION_SOURCES: readonly EngineeringActionSource[] = [
  'Oil Analysis',
  'Oil Lubrication',
  'Vibration',
  'Reliability',
  'Inspection',
];

export const ENGINEERING_ACTION_STATUSES: readonly EngineeringActionStatus[] = [
  'Draft',
  'Open',
  'Assigned',
  'In Progress',
  'Waiting Shutdown',
  'Completed',
  'Verified',
  'Closed',
];

export const ENGINEERING_ACTION_PRIORITIES: readonly EngineeringActionPriority[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
];

export const ACTION_TYPE_OPTIONS: readonly string[] = [
  'Resample',
  'Investigate',
  'Schedule Oil Change',
  'Monitor',
  'Reduce Load',
  'Shutdown Required',
  'Filter Change',
  'Escalate to ACC',
  'Other',
];
