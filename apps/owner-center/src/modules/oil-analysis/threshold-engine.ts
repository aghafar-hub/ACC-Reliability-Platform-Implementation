// apps/owner-center/src/modules/oil-analysis/threshold-engine.ts
// Automatic condition evaluation from OilAnalysisModuleSettings parameter thresholds.

import { oilAnalysisSettingsService } from './settings.service';
import type {
  OilAnalysisConditionLevel,
  OilAnalysisParameterId,
} from './settings-types';
import type { OilConditionLevel, OilLabResultStatus } from './sample.service';

const SEVERITY: Record<OilAnalysisConditionLevel, number> = {
  normal: 0,
  monitor: 1,
  caution: 2,
  critical: 3,
};

/** Numeric lab values used for threshold evaluation. */
export interface OilThresholdLabValues {
  readonly ironPpm: number | null;
  readonly copperPpm: number | null;
  readonly siliconPpm: number | null;
  readonly pqIndex: number | null;
  readonly viscosity100c: number | null;
  readonly tan: number | null;
  readonly oxidation: number | null;
  readonly waterPercent: number | null;
  readonly particle4: number | null;
  readonly particle6: number | null;
  readonly particle14: number | null;
}

function resolveParameterValue(
  id: OilAnalysisParameterId,
  values: OilThresholdLabValues,
): number | null {
  switch (id) {
    case 'iron':
      return values.ironPpm;
    case 'copper':
      return values.copperPpm;
    case 'silicon':
      return values.siliconPpm;
    case 'water':
      return values.waterPercent;
    case 'pqIndex':
      return values.pqIndex;
    case 'viscosity':
      return values.viscosity100c;
    case 'tan':
      return values.tan;
    case 'oxidation':
      return values.oxidation;
    case 'particleCount': {
      const candidates = [values.particle4, values.particle6, values.particle14].filter(
        (v): v is number => v !== null && Number.isFinite(v),
      );
      return candidates.length > 0 ? Math.max(...candidates) : null;
    }
    default:
      return null;
  }
}

function evaluateValueAgainstThresholds(
  value: number,
  thresholds: { monitor: number | null; caution: number | null; critical: number | null },
): OilAnalysisConditionLevel {
  if (thresholds.critical !== null && value >= thresholds.critical) return 'critical';
  if (thresholds.caution !== null && value >= thresholds.caution) return 'caution';
  if (thresholds.monitor !== null && value >= thresholds.monitor) return 'monitor';
  return 'normal';
}

/** Evaluate a single enabled parameter; returns null when value or thresholds are absent. */
export function evaluateParameterCondition(
  parameterId: OilAnalysisParameterId,
  value: number | null,
): OilAnalysisConditionLevel | null {
  if (value === null || !Number.isFinite(value)) return null;

  const setting = oilAnalysisSettingsService
    .getSettings()
    .parameters.find((p) => p.id === parameterId);
  if (!setting?.enabled) return null;

  const { monitor, caution, critical } = setting.thresholds;
  if (monitor === null && caution === null && critical === null) return null;

  return evaluateValueAgainstThresholds(value, { monitor, caution, critical });
}

/**
 * Compute overall condition from enabled parameter thresholds.
 * Highest severity wins. Returns null when no evaluable parameters are present.
 */
export function evaluateThresholdCondition(
  values: OilThresholdLabValues,
): OilConditionLevel | null {
  const settings = oilAnalysisSettingsService.getSettings();
  const levels: OilAnalysisConditionLevel[] = [];

  for (const param of settings.parameters) {
    if (!param.enabled) continue;
    const value = resolveParameterValue(param.id, values);
    if (value === null) continue;
    levels.push(evaluateValueAgainstThresholds(value, param.thresholds));
  }

  if (levels.length === 0) return null;

  return levels.reduce((worst, current) =>
    SEVERITY[current] > SEVERITY[worst] ? current : worst,
  );
}

/** Map evaluated condition level to persisted lab result status. */
export function conditionLevelToResultStatus(level: OilConditionLevel): OilLabResultStatus {
  return level;
}

/** Map evaluated condition level to sample row sub-status after analysis. */
export function conditionLevelToSampleStatus(
  level: OilConditionLevel,
): 'normal' | 'caution' | 'alert' {
  if (level === 'critical') return 'alert';
  if (level === 'caution' || level === 'monitor') return 'caution';
  return 'normal';
}
