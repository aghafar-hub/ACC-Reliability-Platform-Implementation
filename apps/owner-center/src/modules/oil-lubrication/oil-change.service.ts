// apps/owner-center/src/modules/oil-lubrication/oil-change.service.ts
// Local-storage-backed service for the Oil Change Center.
// Sprint 03 — Oil Change Core.
// Sprint 04 — Approval workflow, data warnings, dashboard KPIs, status buckets.
//
// Architecture:
//   OilChangeLocalRepository  — reads/writes localStorage; no React imports.
//   OilChangeLocalService     — business facade; components call only this.
//   oilChangeService          — module-level singleton.
//
// Two entity types:
//   OcTask   — one per LP; represents the LP's current oil change status (the live workload)
//   OcRecord — one per submitted oil change event (the immutable history)

// ── Status & priority types ───────────────────────────────────────────────────

/** Operational status of an oil change task (LP-centric). */
export type OcStatus =
  | 'scheduled'        // due date is in the future (> 7 days)
  | 'due-today'        // next change is due today
  | 'due-soon'         // due within the next 7 days
  | 'overdue'          // past due date, not yet completed
  | 'pending-approval' // technician submitted — awaiting engineer/manager approval
  | 'completed'        // approved and closed
  | 'ok'               // active, due date > 7 days (alias for scheduled)
  | 'no-history'       // active LP but never serviced
  | 'inactive';        // LP deactivated

/** Priority level derived from status and days overdue. */
export type OcPriority = 'low' | 'medium' | 'high' | 'critical';

/** Status of a submitted oil change record. */
export type OcRecordStatus = 'pending-approval' | 'completed' | 'cancelled' | 'rejected';

// ── Task view model (LP-centric) ──────────────────────────────────────────────

/**
 * Represents a lubrication point's current oil change status.
 * One record per active LP; updated when a record is submitted.
 */
export interface OcTask {
  readonly id: string;
  /** LP_ID code (e.g. "LP-001"). */
  readonly lpId: string;
  /** Equipment master ID (e.g. "EQ-PUMP-A01"). */
  readonly equipmentId: string;
  /** Human-readable equipment name. */
  readonly equipmentName: string;
  /** Physical position on equipment (e.g. "Drive End"). */
  readonly position: string;
  /** Plant area or zone (e.g. "Area-01"). */
  readonly area: string;
  /** Owning contractor code. */
  readonly contractorId: string;
  /** Required oil specification (e.g. "ISO VG 46"). */
  readonly oilType: string;
  /** Standard oil volume for a full change, in litres. */
  readonly standardQuantityL: number;
  /** Change interval in calendar days. */
  readonly frequencyDays: number;
  /** Current operational status. */
  readonly status: OcStatus;
  /** ISO date string of the next scheduled change, or null. */
  readonly dueDate: string | null;
  /** ISO date string of the most recent completed change, or null. */
  readonly lastChangeDate: string | null;
  /** Equipment running hours at the most recent service, if recorded. */
  readonly runningHours: number | null;
  /** Computed priority level. */
  readonly priority: OcPriority;
  /** ID of the most recent submitted record, if any. */
  readonly recentRecordId: string | null;
  /** Whether this lubrication point is currently active. */
  readonly isActive?: boolean;
}

// ── Submitted record ──────────────────────────────────────────────────────────

/**
 * An immutable record of a single oil change event submitted by a technician.
 * Hard deletion is prohibited — use status `cancelled` to void a record.
 */
export interface OcRecord {
  readonly id: string;
  /** Linked task (LP). */
  readonly taskId: string;
  readonly lpId: string;
  readonly equipmentId: string;
  readonly equipmentName: string;
  /** Oil type / grade actually used. */
  readonly oilTypeUsed: string;
  /** Quantity actually applied, in litres. */
  readonly quantityUsed: number;
  /** Whether the oil filter was replaced. */
  readonly filterChanged: boolean;
  /** Whether the breather/vent was serviced. */
  readonly breatherServiced: boolean;
  /** Running hours at time of service, if recorded. */
  readonly runningHours: number | null;
  /** Technician who performed the service. */
  readonly technicianName: string;
  /** CMMS work order reference, if any. */
  readonly workOrderId: string | null;
  /** Field notes. */
  readonly notes: string | null;
  /** External attachment URI (e.g. Google Drive link). */
  readonly attachmentUri: string | null;
  /** Lifecycle status. Only 'pending-approval' for newly submitted records. */
  readonly status: OcRecordStatus;
  /** ISO date string when the service was physically performed. */
  readonly performedAt: string;
  /** ISO timestamp when the record was submitted to the system. */
  readonly submittedAt: string;
  // ── Sprint 04 approval fields ──────────────────────────────────────────────
  /** Name of the engineer/manager who approved or rejected this record. */
  readonly reviewedBy?: string | null;
  /** ISO timestamp when the record was reviewed. */
  readonly reviewedAt?: string | null;
  /** Reason provided when the record was rejected. */
  readonly rejectionReason?: string | null;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface OcRecordCreateInput {
  readonly taskId: string;
  readonly oilTypeUsed: string;
  readonly quantityUsed: number;
  readonly filterChanged: boolean;
  readonly breatherServiced: boolean;
  readonly runningHours: number | null;
  readonly technicianName: string;
  readonly workOrderId: string | null;
  readonly notes: string | null;
  readonly attachmentUri: string | null;
  readonly performedAt: string;
}

// ── KPI summary ───────────────────────────────────────────────────────────────

export interface OcKpiSummary {
  readonly dueToday: number;
  readonly overdue: number;
  readonly scheduled: number;
  readonly completedToday: number;
  readonly pendingApproval: number;
}

// ── Dashboard KPI summary (for the main Oil Lubrication dashboard) ─────────────

export interface OilDashboardKpis {
  /** Active lubrication points with due date > 7 days away. */
  readonly totalLp: number;
  readonly activeLp: number;
  readonly overdue: number;
  readonly dueToday: number;
  readonly dueSoon: number;
  readonly pendingApproval: number;
  /** Oil changes completed in the current calendar month. */
  readonly completedThisMonth: number;
  /** Percentage: completed / (completed + overdue), rounded to nearest int. */
  readonly compliancePercent: number;
  /** Oil volume consumed this month (sum of quantityUsed in litres). */
  readonly volumeThisMonthL: number;
}

// ── Data warnings ──────────────────────────────────────────────────────────────

export type OcWarningKind =
  | 'quantity-deviation'
  | 'oil-type-changed'
  | 'running-hours-regression'
  | 'inactive-lp';

export interface OcWarning {
  readonly kind: OcWarningKind;
  /** Human-readable warning message in English. */
  readonly message: string;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
// Reference date: 2026-07-01 (today).
// Tasks mirror LP IDs from the Lubrication Point Explorer seed.

const SEED_TASKS: readonly OcTask[] = [
  {
    id: 'oc-t-001', lpId: 'LP-001',
    equipmentId: 'EQ-PUMP-A01', equipmentName: 'Centrifugal Pump A-01',
    position: 'Drive End',       area: 'Area-01', contractorId: 'ACC',
    oilType: 'ISO VG 46',        standardQuantityL: 5, frequencyDays: 30,
    status: 'overdue',           dueDate: '2026-05-31', lastChangeDate: '2026-05-01',
    runningHours: null,          priority: 'critical', recentRecordId: null,
    isActive: true,
  },
  {
    id: 'oc-t-002', lpId: 'LP-002',
    equipmentId: 'EQ-PUMP-A02', equipmentName: 'Centrifugal Pump A-02',
    position: 'Non-Drive End',   area: 'Area-01', contractorId: 'ACC',
    oilType: 'ISO VG 46',        standardQuantityL: 3, frequencyDays: 30,
    status: 'scheduled',         dueDate: '2026-07-10', lastChangeDate: '2026-06-10',
    runningHours: 4820,          priority: 'low', recentRecordId: null,
    isActive: true,
  },
  {
    id: 'oc-t-003', lpId: 'LP-003',
    equipmentId: 'EQ-COMP-B01', equipmentName: 'Reciprocating Compressor B-01',
    position: 'Gearbox Input',   area: 'Area-02', contractorId: 'RHI',
    oilType: 'Shell Omala S2 G 220', standardQuantityL: 20, frequencyDays: 90,
    status: 'due-today',         dueDate: '2026-07-01', lastChangeDate: '2026-04-01',
    runningHours: 2100,          priority: 'high', recentRecordId: null,
    isActive: true,
  },
  {
    id: 'oc-t-004', lpId: 'LP-004',
    equipmentId: 'EQ-CONV-C01', equipmentName: 'Belt Conveyor C-01',
    position: 'Drive Pulley',    area: 'Area-03', contractorId: 'ASEC',
    oilType: 'Mobil DTE 25',     standardQuantityL: 8, frequencyDays: 60,
    status: 'scheduled',         dueDate: '2026-07-14', lastChangeDate: '2026-05-15',
    runningHours: 3500,          priority: 'low', recentRecordId: null,
    isActive: true,
  },
  {
    id: 'oc-t-005', lpId: 'LP-005',
    equipmentId: 'EQ-MOT-A01',  equipmentName: 'Induction Motor A-01',
    position: 'Drive End Bearing', area: 'Area-01', contractorId: 'ACC',
    oilType: 'ISO VG 32',        standardQuantityL: 2, frequencyDays: 45,
    status: 'overdue',           dueDate: '2026-06-24', lastChangeDate: '2026-05-10',
    runningHours: null,          priority: 'high', recentRecordId: null,
    isActive: true,
  },
  {
    id: 'oc-t-006', lpId: 'LP-006',
    equipmentId: 'EQ-PUMP-D01', equipmentName: 'Slurry Pump D-01',
    position: 'Suction Bearing', area: 'Area-04', contractorId: 'RHI',
    oilType: 'Castrol Hyspin AWS 32', standardQuantityL: 4, frequencyDays: 60,
    status: 'pending-approval',  dueDate: '2026-07-05', lastChangeDate: '2026-07-01',
    runningHours: 1620,          priority: 'medium', recentRecordId: 'oc-r-001',
    isActive: true,
  },
  {
    id: 'oc-t-007', lpId: 'LP-007',
    equipmentId: 'EQ-FAN-E01',  equipmentName: 'Induced Draft Fan E-01',
    position: 'Shaft Bearing',   area: 'Area-05', contractorId: 'ASEC',
    oilType: 'ISO VG 68',        standardQuantityL: 6, frequencyDays: 90,
    status: 'scheduled',         dueDate: '2026-08-30', lastChangeDate: '2026-06-01',
    runningHours: null,          priority: 'low', recentRecordId: null,
    isActive: true,
  },
  {
    id: 'oc-t-008', lpId: 'LP-008',
    equipmentId: 'EQ-COMP-B02', equipmentName: 'Reciprocating Compressor B-02',
    position: 'Gearbox Output',  area: 'Area-02', contractorId: 'RHI',
    oilType: 'Shell Omala S2 G 220', standardQuantityL: 20, frequencyDays: 90,
    status: 'scheduled',         dueDate: '2026-08-30', lastChangeDate: '2026-06-01',
    runningHours: 870,           priority: 'low', recentRecordId: null,
    isActive: true,
  },
  {
    id: 'oc-t-009', lpId: 'LP-009',
    equipmentId: 'EQ-MOT-C01',  equipmentName: 'Induction Motor C-01',
    position: 'Non-Drive End',   area: 'Area-03', contractorId: 'ASEC',
    oilType: 'Mobil DTE 26',     standardQuantityL: 2, frequencyDays: 45,
    status: 'pending-approval',  dueDate: '2026-07-04', lastChangeDate: '2026-07-01',
    runningHours: 3210,          priority: 'medium', recentRecordId: 'oc-r-002',
    isActive: true,
  },
  {
    id: 'oc-t-010', lpId: 'LP-010',
    equipmentId: 'EQ-PUMP-D02', equipmentName: 'Slurry Pump D-02',
    position: 'Discharge Seal',  area: 'Area-04', contractorId: 'ASEC',
    oilType: 'Mobil DTE 25',     standardQuantityL: 4, frequencyDays: 60,
    status: 'due-soon',          dueDate: '2026-07-06', lastChangeDate: '2026-05-07',
    runningHours: null,          priority: 'medium', recentRecordId: null,
    isActive: true,
  },
];

const SEED_RECORDS: readonly OcRecord[] = [
  {
    id: 'oc-r-001', taskId: 'oc-t-006', lpId: 'LP-006',
    equipmentId: 'EQ-PUMP-D01', equipmentName: 'Slurry Pump D-01',
    oilTypeUsed: 'Castrol Hyspin AWS 32', quantityUsed: 4,
    filterChanged: true, breatherServiced: true,
    runningHours: 1620, technicianName: 'Ahmed Al-Rashidi',
    workOrderId: 'WO-2026-1142', notes: 'Oil change completed per PM schedule. Filter replaced. Breather cleaned.',
    attachmentUri: null, status: 'pending-approval',
    performedAt: '2026-07-01', submittedAt: '2026-07-01T09:15:00.000Z',
    reviewedBy: null, reviewedAt: null, rejectionReason: null,
  },
  {
    id: 'oc-r-002', taskId: 'oc-t-009', lpId: 'LP-009',
    equipmentId: 'EQ-MOT-C01', equipmentName: 'Induction Motor C-01',
    oilTypeUsed: 'Mobil DTE 26', quantityUsed: 2.1,
    filterChanged: false, breatherServiced: true,
    runningHours: 3210, technicianName: 'Mohammed Al-Farsi',
    workOrderId: null, notes: 'Slight quantity increase due to oil level below mark.',
    attachmentUri: null, status: 'pending-approval',
    performedAt: '2026-07-01', submittedAt: '2026-07-01T10:42:00.000Z',
    reviewedBy: null, reviewedAt: null, rejectionReason: null,
  },
  {
    id: 'oc-r-003', taskId: 'oc-t-004', lpId: 'LP-004',
    equipmentId: 'EQ-CONV-C01', equipmentName: 'Belt Conveyor C-01',
    oilTypeUsed: 'Mobil DTE 25', quantityUsed: 8,
    filterChanged: true, breatherServiced: false,
    runningHours: 3500, technicianName: 'Khalid Al-Harthi',
    workOrderId: 'WO-2026-0988', notes: null,
    attachmentUri: null, status: 'completed',
    performedAt: '2026-05-15', submittedAt: '2026-05-15T14:00:00.000Z',
    reviewedBy: 'Eng. Salim Al-Kindi', reviewedAt: '2026-05-15T16:30:00.000Z', rejectionReason: null,
  },
  {
    id: 'oc-r-004', taskId: 'oc-t-001', lpId: 'LP-001',
    equipmentId: 'EQ-PUMP-A01', equipmentName: 'Centrifugal Pump A-01',
    oilTypeUsed: 'ISO VG 46', quantityUsed: 5,
    filterChanged: true, breatherServiced: true,
    runningHours: null, technicianName: 'Ahmed Al-Rashidi',
    workOrderId: 'WO-2026-0754', notes: 'Routine PM oil change. No anomalies observed.',
    attachmentUri: null, status: 'completed',
    performedAt: '2026-05-01', submittedAt: '2026-05-01T11:30:00.000Z',
    reviewedBy: 'Eng. Salim Al-Kindi', reviewedAt: '2026-05-01T13:00:00.000Z', rejectionReason: null,
  },
  {
    id: 'oc-r-005', taskId: 'oc-t-005', lpId: 'LP-005',
    equipmentId: 'EQ-MOT-A01', equipmentName: 'Induction Motor A-01',
    oilTypeUsed: 'ISO VG 32', quantityUsed: 2,
    filterChanged: false, breatherServiced: false,
    runningHours: null, technicianName: 'Mohammed Al-Farsi',
    workOrderId: null, notes: null,
    attachmentUri: null, status: 'completed',
    performedAt: '2026-05-10', submittedAt: '2026-05-10T08:20:00.000Z',
    reviewedBy: 'Eng. Salim Al-Kindi', reviewedAt: '2026-05-10T10:00:00.000Z', rejectionReason: null,
  },
];

// ── Storage keys ──────────────────────────────────────────────────────────────

const TASKS_KEY   = 'acc.oil-change.tasks.v1';
const RECORDS_KEY = 'acc.oil-change.records.v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

// ── Repository ────────────────────────────────────────────────────────────────

class OilChangeLocalRepository {
  private tasks:   Map<string, OcTask>;
  private records: Map<string, OcRecord>;

  constructor() {
    this.tasks   = this.loadTasks();
    this.records = this.loadRecords();
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  private loadTasks(): Map<string, OcTask> {
    try {
      const raw = window.localStorage.getItem(TASKS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Map((parsed as OcTask[]).map((t) => [t.id, t]));
        }
      }
    } catch { /* fall through to seed */ }
    const map = new Map(SEED_TASKS.map((t) => [t.id, t]));
    this.persistTasks(map);
    return map;
  }

  private persistTasks(map: Map<string, OcTask>): void {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(Array.from(map.values())));
  }

  listTasks(): readonly OcTask[] {
    return Array.from(this.tasks.values());
  }

  findTask(id: string): OcTask | null {
    return this.tasks.get(id) ?? null;
  }

  saveTask(task: OcTask): void {
    this.tasks.set(task.id, task);
    this.persistTasks(this.tasks);
  }

  // ── Records ──────────────────────────────────────────────────────────────

  private loadRecords(): Map<string, OcRecord> {
    try {
      const raw = window.localStorage.getItem(RECORDS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Map((parsed as OcRecord[]).map((r) => [r.id, r]));
        }
      }
    } catch { /* fall through to seed */ }
    const map = new Map(SEED_RECORDS.map((r) => [r.id, r]));
    this.persistRecords(map);
    return map;
  }

  private persistRecords(map: Map<string, OcRecord>): void {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(Array.from(map.values())));
  }

  listRecords(): readonly OcRecord[] {
    return Array.from(this.records.values());
  }

  findRecord(id: string): OcRecord | null {
    return this.records.get(id) ?? null;
  }

  saveRecord(record: OcRecord): void {
    this.records.set(record.id, record);
    this.persistRecords(this.records);
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Business service facade for the Oil Change Center.
 * All component interactions go through this service — never direct localStorage.
 */
export class OilChangeLocalService {
  constructor(private readonly repo: OilChangeLocalRepository) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  listTasks(): readonly OcTask[] {
    return this.repo.listTasks();
  }

  listRecords(): readonly OcRecord[] {
    return this.repo.listRecords();
  }

  getRecordsForTask(taskId: string): readonly OcRecord[] {
    return this.repo.listRecords().filter((r) => r.taskId === taskId);
  }

  computeKpis(): OcKpiSummary {
    const tasks   = this.repo.listTasks();
    const records = this.repo.listRecords();
    const today   = todayIso();

    return {
      dueToday:       tasks.filter((t) => t.status === 'due-today').length,
      overdue:        tasks.filter((t) => t.status === 'overdue').length,
      scheduled:      tasks.filter((t) => t.status === 'scheduled' || t.status === 'due-soon' || t.status === 'ok').length,
      completedToday: records.filter((r) => r.performedAt === today && r.status === 'completed').length,
      pendingApproval: tasks.filter((t) => t.status === 'pending-approval').length,
    };
  }

  /**
   * Compute live dashboard KPIs for the Oil Lubrication module main dashboard.
   * Reads from tasks and records; no parameters needed.
   */
  computeDashboardKpis(): OilDashboardKpis {
    const tasks   = this.repo.listTasks();
    const records = this.repo.listRecords();
    const ym      = currentYearMonth();

    const totalLp    = tasks.length;
    const activeLp   = tasks.filter((t) => t.isActive !== false).length;
    const overdue    = tasks.filter((t) => t.status === 'overdue').length;
    const dueToday   = tasks.filter((t) => t.status === 'due-today').length;
    const dueSoon    = tasks.filter((t) => t.status === 'due-soon').length;
    const pending    = tasks.filter((t) => t.status === 'pending-approval').length;

    const completedThisMonth = records.filter(
      (r) => r.status === 'completed' && r.performedAt.startsWith(ym),
    ).length;

    const volumeThisMonthL = records
      .filter((r) => r.status === 'completed' && r.performedAt.startsWith(ym))
      .reduce((sum, r) => sum + r.quantityUsed, 0);

    // Compliance = completed / (completed + overdue) in percentage
    const complianceDenominator = completedThisMonth + overdue;
    const compliancePercent = complianceDenominator > 0
      ? Math.round((completedThisMonth / complianceDenominator) * 100)
      : activeLp > 0 ? (overdue === 0 ? 100 : 0) : 0;

    return {
      totalLp,
      activeLp,
      overdue,
      dueToday,
      dueSoon,
      pendingApproval: pending,
      completedThisMonth,
      compliancePercent,
      volumeThisMonthL: Math.round(volumeThisMonthL * 10) / 10,
    };
  }

  // ── Submit oil change ──────────────────────────────────────────────────────

  submitRecord(input: OcRecordCreateInput): { task: OcTask; record: OcRecord } {
    const task = this.repo.findTask(input.taskId);
    if (!task) throw new Error(`Task not found: ${input.taskId}`);

    const record: OcRecord = {
      id:             generateId('oc-r'),
      taskId:         task.id,
      lpId:           task.lpId,
      equipmentId:    task.equipmentId,
      equipmentName:  task.equipmentName,
      oilTypeUsed:    input.oilTypeUsed,
      quantityUsed:   input.quantityUsed,
      filterChanged:  input.filterChanged,
      breatherServiced: input.breatherServiced,
      runningHours:   input.runningHours,
      technicianName: input.technicianName,
      workOrderId:    input.workOrderId,
      notes:          input.notes,
      attachmentUri:  input.attachmentUri,
      status:         'pending-approval',
      performedAt:    input.performedAt,
      submittedAt:    isoNow(),
      reviewedBy:     null,
      reviewedAt:     null,
      rejectionReason: null,
    };

    const updatedTask: OcTask = {
      ...task,
      status:          'pending-approval',
      lastChangeDate:  input.performedAt,
      runningHours:    input.runningHours ?? task.runningHours,
      priority:        'medium',
      recentRecordId:  record.id,
    };

    this.repo.saveRecord(record);
    this.repo.saveTask(updatedTask);

    return { task: updatedTask, record };
  }

  // ── Approval workflow ──────────────────────────────────────────────────────

  /**
   * Approve a pending-approval record.
   * Transitions: record → completed, task → completed.
   */
  approveRecord(
    recordId: string,
    reviewerName: string,
  ): { task: OcTask; record: OcRecord } {
    const record = this.repo.findRecord(recordId);
    if (!record) throw new Error(`Record not found: ${recordId}`);
    if (record.status !== 'pending-approval') {
      throw new Error(`Record ${recordId} is not pending approval (status: ${record.status})`);
    }

    const approvedRecord: OcRecord = {
      ...record,
      status:     'completed',
      reviewedBy: reviewerName,
      reviewedAt: isoNow(),
    };

    const task = this.repo.findTask(record.taskId);

    // Recompute next due date from approvedAt performedAt + frequency
    let nextDueDate: string | null = null;
    if (task) {
      const performedDate = new Date(record.performedAt);
      performedDate.setDate(performedDate.getDate() + task.frequencyDays);
      nextDueDate = performedDate.toISOString().slice(0, 10);
    }

    const updatedTask: OcTask | null = task
      ? {
          ...task,
          status:        'scheduled',
          dueDate:       nextDueDate,
          lastChangeDate: record.performedAt,
          priority:      'low',
        }
      : null;

    this.repo.saveRecord(approvedRecord);
    if (updatedTask) this.repo.saveTask(updatedTask);

    return {
      record: approvedRecord,
      task:   updatedTask ?? task!,
    };
  }

  /**
   * Reject a pending-approval record with a reason.
   * Transitions: record → rejected, task restored to previous status.
   */
  rejectRecord(
    recordId: string,
    reason: string,
    reviewerName: string,
  ): { task: OcTask; record: OcRecord } {
    const record = this.repo.findRecord(recordId);
    if (!record) throw new Error(`Record not found: ${recordId}`);
    if (record.status !== 'pending-approval') {
      throw new Error(`Record ${recordId} is not pending approval (status: ${record.status})`);
    }

    const rejectedRecord: OcRecord = {
      ...record,
      status:          'rejected',
      reviewedBy:      reviewerName,
      reviewedAt:      isoNow(),
      rejectionReason: reason,
    };

    const task = this.repo.findTask(record.taskId);

    // Revert task status based on its due date
    let revertedStatus: OcStatus = 'scheduled';
    if (task?.dueDate) {
      const today = todayIso();
      const diffMs = new Date(task.dueDate).getTime() - new Date(today).getTime();
      const diffDays = Math.ceil(diffMs / 86_400_000);
      if (diffDays < 0)       revertedStatus = 'overdue';
      else if (diffDays === 0) revertedStatus = 'due-today';
      else if (diffDays <= 7) revertedStatus = 'due-soon';
      else                    revertedStatus = 'scheduled';
    }

    const updatedTask: OcTask | null = task
      ? {
          ...task,
          status:         revertedStatus,
          recentRecordId: null,
          priority:       revertedStatus === 'overdue' ? 'high' : 'medium',
        }
      : null;

    this.repo.saveRecord(rejectedRecord);
    if (updatedTask) this.repo.saveTask(updatedTask);

    return {
      record: rejectedRecord,
      task:   updatedTask ?? task!,
    };
  }

  // ── Data warnings ──────────────────────────────────────────────────────────

  /**
   * Compute advisory warnings before submitting a record.
   * Does not block submission — warnings are informational only.
   */
  computeWarnings(input: OcRecordCreateInput, task: OcTask): readonly OcWarning[] {
    const warnings: OcWarning[] = [];

    // Inactive LP
    if (task.isActive === false) {
      warnings.push({
        kind:    'inactive-lp',
        message: `LP ${task.lpId} is marked inactive. Verify this point is still in service.`,
      });
    }

    // Quantity deviation (> 20% from standard)
    if (task.standardQuantityL > 0) {
      const ratio = input.quantityUsed / task.standardQuantityL;
      if (ratio < 0.8 || ratio > 1.2) {
        const pct = Math.round(Math.abs(ratio - 1) * 100);
        const dir = ratio > 1 ? 'above' : 'below';
        warnings.push({
          kind:    'quantity-deviation',
          message: `Quantity ${input.quantityUsed} L is ${pct}% ${dir} the standard ${task.standardQuantityL} L. Verify with supervisor.`,
        });
      }
    }

    // Oil type changed
    const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalise(input.oilTypeUsed) !== normalise(task.oilType)) {
      warnings.push({
        kind:    'oil-type-changed',
        message: `Oil type "${input.oilTypeUsed}" differs from specification "${task.oilType}". Confirm substitution is approved.`,
      });
    }

    // Running hours regression (new hours < previously recorded hours)
    if (
      input.runningHours !== null &&
      task.runningHours !== null &&
      input.runningHours < task.runningHours
    ) {
      warnings.push({
        kind:    'running-hours-regression',
        message: `Running hours ${input.runningHours} is less than the previously recorded ${task.runningHours}. Check meter reading.`,
      });
    }

    return warnings;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const oilChangeService = new OilChangeLocalService(
  new OilChangeLocalRepository(),
);
