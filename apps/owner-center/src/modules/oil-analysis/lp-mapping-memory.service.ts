// apps/owner-center/src/modules/oil-analysis/lp-mapping-memory.service.ts
// Rule-based Equipment_ID ↔ LP_ID mapping memory for smart import suggestions.

const STORAGE_KEY = 'acc.oil-analysis.lp-mapping-memory.v1';

export interface LpMappingMemoryEntry {
  readonly equipmentId: string;
  readonly lubricationPointId: string;
  readonly reportPattern: string;
  readonly learnedAt: string;
  readonly useCount: number;
}

function isoNow(): string {
  return new Date().toISOString();
}

function readAll(): LpMappingMemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is LpMappingMemoryEntry =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as LpMappingMemoryEntry).equipmentId === 'string' &&
        typeof (e as LpMappingMemoryEntry).lubricationPointId === 'string',
    );
  } catch {
    return [];
  }
}

function writeAll(entries: LpMappingMemoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function memoryKey(equipmentId: string, reportPattern: string): string {
  return `${equipmentId.trim().toLowerCase()}::${reportPattern.trim().toLowerCase()}`;
}

export function suggestLpMapping(
  equipmentId: string,
  reportPattern: string,
): string | null {
  const key = memoryKey(equipmentId, reportPattern);
  const entries = readAll();
  const exact = entries.find(
    (e) => memoryKey(e.equipmentId, e.reportPattern) === key,
  );
  if (exact) return exact.lubricationPointId;

  const equipmentOnly = entries
    .filter((e) => e.equipmentId.trim().toLowerCase() === equipmentId.trim().toLowerCase())
    .sort((a, b) => b.useCount - a.useCount || b.learnedAt.localeCompare(a.learnedAt));
  return equipmentOnly[0]?.lubricationPointId ?? null;
}

export function rememberLpMapping(
  equipmentId: string,
  lubricationPointId: string,
  reportPattern: string,
): void {
  const eq = equipmentId.trim();
  const lp = lubricationPointId.trim();
  const pattern = reportPattern.trim() || 'generic';
  if (!eq || !lp) return;

  const key = memoryKey(eq, pattern);
  const entries = readAll();
  const idx = entries.findIndex((e) => memoryKey(e.equipmentId, e.reportPattern) === key);

  if (idx >= 0) {
    const existing = entries[idx] as LpMappingMemoryEntry;
    entries[idx] = {
      ...existing,
      lubricationPointId: lp,
      learnedAt: isoNow(),
      useCount: existing.useCount + 1,
    };
  } else {
    entries.push({
      equipmentId: eq,
      lubricationPointId: lp,
      reportPattern: pattern,
      learnedAt: isoNow(),
      useCount: 1,
    });
  }

  writeAll(entries);
}

export function listLpMappingMemory(): readonly LpMappingMemoryEntry[] {
  return readAll();
}
