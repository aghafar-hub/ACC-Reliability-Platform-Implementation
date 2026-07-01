// apps/owner-center/src/modules/oil-lubrication/lubrication-point.service.ts
// Local-storage-backed service for the Lubrication Point Explorer.
//
// Sprint 02 — Lubrication Point Explorer.
//
// Architecture:
//   LubricationPointLocalRepository  — reads/writes localStorage; no React imports.
//   LubricationPointLocalService     — business facade; components call only this.
//   lubricationPointService          — singleton wired at module load time.
//
// React components MUST NOT access localStorage directly; they call the service.

// ── View model ────────────────────────────────────────────────────────────────

/** Row used by the Explorer UI; flat projection of a lubrication point. */
export interface LpExplorerRow {
  readonly id:                  string;
  /** LP_ID code visible to technicians (e.g. "LP-001"). */
  readonly lubricationPointId:  string;
  /** Equipment master ID (e.g. "EQ-PUMP-A01"). */
  readonly equipmentId:         string;
  /** Owning contractor code (e.g. "ACC", "RHI"). */
  readonly contractorId:        string;
  /** Human-readable name (e.g. "Main Bearing"). */
  readonly name:                string;
  /** Plant area (e.g. "Area-01"). */
  readonly area:                string;
  /** Lubricant type / grade (e.g. "ISO VG 46"). */
  readonly oilType:             string;
  /** Scheduled service interval in calendar days. */
  readonly frequencyDays:       number;
  /** ISO date of last oil change, or null if never changed. */
  readonly lastChangeDate:      string | null;
  /** ISO date when next change is due, or null if not scheduled. */
  readonly nextDueDate:         string | null;
  /** Whether the point is operationally active. */
  readonly isActive:            boolean;
  readonly createdAt:           string;
  readonly updatedAt:           string;
}

/** Operational status derived from due dates and active flag. */
export type LpStatus = 'active' | 'due-soon' | 'overdue' | 'inactive';

/** Compute display status from a row — pure function, no side effects. */
export function computeLpStatus(row: LpExplorerRow): LpStatus {
  if (!row.isActive) return 'inactive';
  if (!row.nextDueDate) return 'active';
  const today = new Date();
  const due   = new Date(row.nextDueDate);
  if (due < today) return 'overdue';
  const diffDays = (due.getTime() - today.getTime()) / 86_400_000;
  return diffDays <= 7 ? 'due-soon' : 'active';
}

// ── Create / update input types ───────────────────────────────────────────────

export interface LpCreateInput {
  readonly lubricationPointId: string;
  readonly equipmentId:        string;
  readonly contractorId:       string;
  readonly name:               string;
  readonly area:               string;
  readonly oilType:            string;
  readonly frequencyDays:      number;
  readonly lastChangeDate:     string | null;
  readonly nextDueDate:        string | null;
}

export type LpUpdateInput = Partial<
  Pick<
    LpExplorerRow,
    'name' | 'area' | 'oilType' | 'frequencyDays' | 'lastChangeDate' | 'nextDueDate' | 'isActive'
  >
>;

// ── Seed data (realistic development fixtures) ────────────────────────────────
// Today: 2026-07-01 — dates chosen to produce a mix of statuses.

const SEED_ROWS: readonly LpExplorerRow[] = [
  {
    id: 'lp-seed-001', lubricationPointId: 'LP-001',
    equipmentId: 'EQ-PUMP-A01', contractorId: 'ACC',
    name: 'Main Bearing',             area: 'Area-01', oilType: 'ISO VG 46',
    frequencyDays: 30,  lastChangeDate: '2026-05-01', nextDueDate: '2026-05-31',
    isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lp-seed-002', lubricationPointId: 'LP-002',
    equipmentId: 'EQ-PUMP-A02', contractorId: 'ACC',
    name: 'Impeller Seal',            area: 'Area-01', oilType: 'ISO VG 46',
    frequencyDays: 30,  lastChangeDate: '2026-06-10', nextDueDate: '2026-07-10',
    isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'lp-seed-003', lubricationPointId: 'LP-003',
    equipmentId: 'EQ-COMP-B01', contractorId: 'RHI',
    name: 'Gearbox Input Shaft',      area: 'Area-02', oilType: 'Shell Omala S2 G 220',
    frequencyDays: 90,  lastChangeDate: '2026-04-01', nextDueDate: '2026-07-01',
    isActive: true, createdAt: '2026-01-15T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'lp-seed-004', lubricationPointId: 'LP-004',
    equipmentId: 'EQ-CONV-C01', contractorId: 'ASEC',
    name: 'Drive Pulley Bearing',     area: 'Area-03', oilType: 'Mobil DTE 25',
    frequencyDays: 60,  lastChangeDate: '2026-05-15', nextDueDate: '2026-07-14',
    isActive: true, createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'lp-seed-005', lubricationPointId: 'LP-005',
    equipmentId: 'EQ-MOT-A01', contractorId: 'ACC',
    name: 'Motor Drive End Bearing',  area: 'Area-01', oilType: 'ISO VG 32',
    frequencyDays: 45,  lastChangeDate: '2026-05-10', nextDueDate: '2026-06-24',
    isActive: true, createdAt: '2026-02-10T00:00:00.000Z', updatedAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'lp-seed-006', lubricationPointId: 'LP-006',
    equipmentId: 'EQ-PUMP-D01', contractorId: 'RHI',
    name: 'Suction Side Seal',        area: 'Area-04', oilType: 'Castrol Hyspin AWS 32',
    frequencyDays: 60,  lastChangeDate: '2026-06-25', nextDueDate: '2026-07-05',
    isActive: true, createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'lp-seed-007', lubricationPointId: 'LP-007',
    equipmentId: 'EQ-FAN-E01', contractorId: 'ASEC',
    name: 'Fan Shaft Bearing',        area: 'Area-05', oilType: 'ISO VG 68',
    frequencyDays: 90,  lastChangeDate: '2026-06-01', nextDueDate: '2026-08-30',
    isActive: true, createdAt: '2026-03-15T00:00:00.000Z', updatedAt: '2026-03-15T00:00:00.000Z',
  },
  {
    id: 'lp-seed-008', lubricationPointId: 'LP-008',
    equipmentId: 'EQ-COMP-B02', contractorId: 'RHI',
    name: 'Gearbox Output Shaft',     area: 'Area-02', oilType: 'Shell Omala S2 G 220',
    frequencyDays: 90,  lastChangeDate: '2026-06-01', nextDueDate: '2026-08-30',
    isActive: true, createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'lp-seed-009', lubricationPointId: 'LP-009',
    equipmentId: 'EQ-MOT-C01', contractorId: 'ASEC',
    name: 'Non-Drive End Bearing',    area: 'Area-03', oilType: 'Mobil DTE 26',
    frequencyDays: 45,  lastChangeDate: '2026-06-28', nextDueDate: '2026-07-04',
    isActive: true, createdAt: '2026-04-15T00:00:00.000Z', updatedAt: '2026-04-15T00:00:00.000Z',
  },
  {
    id: 'lp-seed-010', lubricationPointId: 'LP-010',
    equipmentId: 'EQ-PUMP-A03', contractorId: 'ACC',
    name: 'Coupling Guard Bearing',   area: 'Area-01', oilType: 'ISO VG 46',
    frequencyDays: 60,  lastChangeDate: null, nextDueDate: null,
    isActive: false, createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z',
  },
];

// ── Repository ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'acc.oil-lube.lp.registry';

function generateId(): string {
  return `lp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Synchronous localStorage repository for LpExplorerRow records.
 * Hydrates from storage on construction; seeds sample data when storage is empty.
 * All mutations persist immediately.
 */
class LubricationPointLocalRepository {
  private readonly records: Map<string, LpExplorerRow>;

  constructor() {
    const loaded = this.readFromStorage();
    if (loaded.length === 0) {
      this.records = new Map(SEED_ROWS.map((r) => [r.id, r]));
      this.writeToStorage();
    } else {
      this.records = new Map(loaded.map((r) => [r.id, r]));
    }
  }

  private readFromStorage(): LpExplorerRow[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as LpExplorerRow[]) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(): void {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(this.records.values())),
    );
  }

  list(): readonly LpExplorerRow[] {
    return Array.from(this.records.values());
  }

  findById(id: string): LpExplorerRow | null {
    return this.records.get(id) ?? null;
  }

  create(input: LpCreateInput): LpExplorerRow {
    const row: LpExplorerRow = {
      id:                 generateId(),
      lubricationPointId: input.lubricationPointId,
      equipmentId:        input.equipmentId,
      contractorId:       input.contractorId,
      name:               input.name,
      area:               input.area,
      oilType:            input.oilType,
      frequencyDays:      input.frequencyDays,
      lastChangeDate:     input.lastChangeDate,
      nextDueDate:        input.nextDueDate,
      isActive:           true,
      createdAt:          isoNow(),
      updatedAt:          isoNow(),
    };
    this.records.set(row.id, row);
    this.writeToStorage();
    return row;
  }

  update(id: string, changes: LpUpdateInput): LpExplorerRow {
    const existing = this.records.get(id);
    if (!existing) throw new Error(`LubricationPoint not found: ${id}`);
    const updated: LpExplorerRow = { ...existing, ...changes, updatedAt: isoNow() };
    this.records.set(id, updated);
    this.writeToStorage();
    return updated;
  }

  deactivate(id: string): LpExplorerRow {
    return this.update(id, { isActive: false });
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Business service facade for lubrication point operations.
 * Components access data exclusively through this service; no direct repository
 * or localStorage access from React.
 */
export class LubricationPointLocalService {
  constructor(private readonly repo: LubricationPointLocalRepository) {}

  list(): readonly LpExplorerRow[] {
    return this.repo.list();
  }

  create(input: LpCreateInput): LpExplorerRow {
    if (!input.lubricationPointId.trim()) {
      throw new Error('LP ID is required.');
    }
    if (!input.equipmentId.trim()) {
      throw new Error('Equipment ID is required.');
    }
    if (!input.name.trim()) {
      throw new Error('Name is required.');
    }
    const existing = this.repo.list().find(
      (r) => r.lubricationPointId === input.lubricationPointId.trim(),
    );
    if (existing) {
      throw new Error(`LP ID '${input.lubricationPointId}' already exists.`);
    }
    return this.repo.create(input);
  }

  update(id: string, changes: LpUpdateInput): LpExplorerRow {
    return this.repo.update(id, changes);
  }

  deactivate(id: string): LpExplorerRow {
    return this.repo.deactivate(id);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const lubricationPointService = new LubricationPointLocalService(
  new LubricationPointLocalRepository(),
);
