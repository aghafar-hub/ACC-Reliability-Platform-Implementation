// apps/owner-center/src/modules/oil-analysis/settings.service.ts
// Single settings service for Oil Analysis module administration.
//
// Sprint 09 — cached in memory, persisted to localStorage.
// React components MUST NOT access localStorage directly.

import type {
  OilAnalysisModuleSettings,
  OilAnalysisGeneralSettings,
  OilAnalysisLaboratorySettings,
  OilAnalysisParameterSetting,
  OilAnalysisConditionRules,
  OilAnalysisParameterId,
} from './settings-types';

export type {
  OilAnalysisModuleSettings,
  OilAnalysisGeneralSettings,
  OilAnalysisLaboratorySettings,
  OilAnalysisParameterSetting,
  OilAnalysisConditionRules,
  OilAnalysisParameterId,
  OilAnalysisConditionLevel,
  OilAnalysisSettingsAudit,
} from './settings-types';

const STORAGE_KEY = 'acc.oil-analysis.settings.v1';

function isoNow(): string {
  return new Date().toISOString();
}

const DEFAULT_PARAMETERS: readonly OilAnalysisParameterSetting[] = [
  {
    id: 'iron',
    labelEn: 'Iron',
    labelAr: 'الحديد',
    unit: 'ppm',
    enabled: true,
    thresholds: { monitor: 50, caution: 100, critical: 200 },
  },
  {
    id: 'copper',
    labelEn: 'Copper',
    labelAr: 'النحاس',
    unit: 'ppm',
    enabled: true,
    thresholds: { monitor: 20, caution: 50, critical: 100 },
  },
  {
    id: 'silicon',
    labelEn: 'Silicon',
    labelAr: 'السيليكون',
    unit: 'ppm',
    enabled: true,
    thresholds: { monitor: 15, caution: 30, critical: 60 },
  },
  {
    id: 'water',
    labelEn: 'Water',
    labelAr: 'الماء',
    unit: '%',
    enabled: true,
    thresholds: { monitor: 0.05, caution: 0.1, critical: 0.2 },
  },
  {
    id: 'pqIndex',
    labelEn: 'PQ Index',
    labelAr: 'مؤشر PQ',
    unit: '',
    enabled: true,
    thresholds: { monitor: 15, caution: 30, critical: 50 },
  },
  {
    id: 'viscosity',
    labelEn: 'Viscosity',
    labelAr: 'اللزوجة',
    unit: 'cSt',
    enabled: true,
    thresholds: { monitor: 5, caution: 10, critical: 15 },
  },
  {
    id: 'tan',
    labelEn: 'TAN',
    labelAr: 'TAN',
    unit: '',
    enabled: true,
    thresholds: { monitor: 1.5, caution: 2.5, critical: 4.0 },
  },
  {
    id: 'oxidation',
    labelEn: 'Oxidation',
    labelAr: 'الأكسدة',
    unit: '',
    enabled: true,
    thresholds: { monitor: 20, caution: 35, critical: 50 },
  },
  {
    id: 'particleCount',
    labelEn: 'Particle Count',
    labelAr: 'عدد الجسيمات',
    unit: '/mL',
    enabled: true,
    thresholds: { monitor: 5000, caution: 10000, critical: 20000 },
  },
] as const;

export function createDefaultOilAnalysisSettings(): OilAnalysisModuleSettings {
  const now = isoNow();
  return {
    general: {
      defaultSampleStatus: 'imported',
      defaultApprovalWorkflowEnabled: true,
      requireEngineerApproval: true,
      enableTrendEngine: true,
      enablePdfImport: true,
      enableManualEntry: true,
      enableCsvExport: true,
      enableJsonExport: true,
    },
    laboratory: {
      defaultLaboratory: 'ACC Central Laboratory',
      sampleNumberPrefix: 'OA',
      defaultCurrency: 'SAR',
      defaultReportLanguage: 'en',
      units: { ppm: 'ppm', cSt: 'cSt', percent: '%' },
      dateFormat: 'YYYY-MM-DD',
    },
    parameters: DEFAULT_PARAMETERS.map((p) => ({
      ...p,
      thresholds: { ...p.thresholds },
    })),
    conditionRules: {
      levels: [
        {
          level: 'normal',
          descriptionEn: 'All parameters within baseline limits. No action required.',
          descriptionAr: 'جميع المعاملات ضمن الحدود الأساسية. لا يلزم إجراء.',
        },
        {
          level: 'monitor',
          descriptionEn: 'Early deviation detected. Schedule follow-up sampling.',
          descriptionAr: 'انحراف مبكر. جدولة عينة متابعة.',
        },
        {
          level: 'caution',
          descriptionEn: 'Elevated wear or contamination. Investigate root cause.',
          descriptionAr: 'تآكل أو تلوث مرتفع. تحقق من السبب الجذري.',
        },
        {
          level: 'critical',
          descriptionEn: 'Immediate action required. Consider equipment shutdown.',
          descriptionAr: 'إجراء فوري مطلوب. يُنصح بإيقاف المعدة.',
        },
      ],
    },
    audit: {
      lastChangeSummary: 'Default settings initialized',
      changedBy: 'System',
      changedAt: now,
    },
  };
}

function normalizeSettings(raw: unknown): OilAnalysisModuleSettings {
  const defaults = createDefaultOilAnalysisSettings();
  if (!raw || typeof raw !== 'object') return defaults;

  const doc = raw as Partial<OilAnalysisModuleSettings>;
  const general = { ...defaults.general, ...(doc.general ?? {}) };
  const laboratory = {
    ...defaults.laboratory,
    ...(doc.laboratory ?? {}),
    units: { ...defaults.laboratory.units, ...(doc.laboratory?.units ?? {}) },
  };

  const parameters = mergeParameters(doc.parameters, defaults.parameters);
  const conditionRules = {
    levels: doc.conditionRules?.levels?.length
      ? doc.conditionRules.levels
      : defaults.conditionRules.levels,
  };
  const audit = { ...defaults.audit, ...(doc.audit ?? {}) };

  return { general, laboratory, parameters, conditionRules, audit };
}

function mergeParameters(
  incoming: readonly OilAnalysisParameterSetting[] | undefined,
  defaults: readonly OilAnalysisParameterSetting[],
): readonly OilAnalysisParameterSetting[] {
  if (!incoming?.length) return defaults;

  const byId = new Map(incoming.map((p) => [p.id, p]));
  return defaults.map((def) => {
    const found = byId.get(def.id);
    if (!found) return { ...def, thresholds: { ...def.thresholds } };
    return {
      ...def,
      ...found,
      thresholds: { ...def.thresholds, ...found.thresholds },
    };
  });
}

class OilAnalysisSettingsRepository {
  private cached: OilAnalysisModuleSettings;

  constructor() {
    this.cached = this.readFromStorage();
  }

  private readFromStorage(): OilAnalysisModuleSettings {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultOilAnalysisSettings();
      return normalizeSettings(JSON.parse(raw) as unknown);
    } catch {
      return createDefaultOilAnalysisSettings();
    }
  }

  private writeToStorage(): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cached));
  }

  get(): OilAnalysisModuleSettings {
    return this.cached;
  }

  save(settings: OilAnalysisModuleSettings, actor: string, changeSummary: string): OilAnalysisModuleSettings {
    this.cached = {
      ...settings,
      audit: {
        lastChangeSummary: changeSummary,
        changedBy: actor,
        changedAt: isoNow(),
      },
    };
    this.writeToStorage();
    return this.cached;
  }

  reset(actor: string): OilAnalysisModuleSettings {
    const fresh = createDefaultOilAnalysisSettings();
    return this.save(fresh, actor, 'Module settings reset to defaults');
  }
}

export class OilAnalysisSettingsService {
  constructor(private readonly repo: OilAnalysisSettingsRepository) {}

  /** Instant read from in-memory cache. */
  getSettings(): OilAnalysisModuleSettings {
    return this.repo.get();
  }

  saveSettings(
    settings: OilAnalysisModuleSettings,
    actor: string,
    changeSummary = 'Settings updated',
  ): OilAnalysisModuleSettings {
    return this.repo.save(settings, actor, changeSummary);
  }

  updateGeneral(
    general: OilAnalysisGeneralSettings,
    actor: string,
  ): OilAnalysisModuleSettings {
    const current = this.repo.get();
    return this.repo.save(
      { ...current, general },
      actor,
      'General settings updated',
    );
  }

  updateLaboratory(
    laboratory: OilAnalysisLaboratorySettings,
    actor: string,
  ): OilAnalysisModuleSettings {
    const current = this.repo.get();
    return this.repo.save(
      { ...current, laboratory },
      actor,
      'Laboratory settings updated',
    );
  }

  updateParameters(
    parameters: readonly OilAnalysisParameterSetting[],
    actor: string,
  ): OilAnalysisModuleSettings {
    const current = this.repo.get();
    return this.repo.save(
      { ...current, parameters },
      actor,
      'Parameter settings updated',
    );
  }

  updateConditionRules(
    conditionRules: OilAnalysisConditionRules,
    actor: string,
  ): OilAnalysisModuleSettings {
    const current = this.repo.get();
    return this.repo.save(
      { ...current, conditionRules },
      actor,
      'Condition rules updated',
    );
  }

  resetToDefaults(actor: string): OilAnalysisModuleSettings {
    return this.repo.reset(actor);
  }

  exportSettingsJson(): string {
    return JSON.stringify(this.repo.get(), null, 2);
  }

  importSettingsJson(json: string, actor: string): OilAnalysisModuleSettings {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON file.');
    }
    const normalized = normalizeSettings(parsed);
    return this.repo.save(normalized, actor, 'Settings imported from JSON');
  }

  isParameterEnabled(id: OilAnalysisParameterId): boolean {
    const param = this.repo.get().parameters.find((p) => p.id === id);
    return param?.enabled ?? true;
  }

  getEnabledParameterIds(): readonly OilAnalysisParameterId[] {
    return this.repo.get().parameters.filter((p) => p.enabled).map((p) => p.id);
  }

  getSampleNumberPrefix(): string {
    const prefix = this.repo.get().laboratory.sampleNumberPrefix.trim();
    return prefix || 'OA';
  }
}

export const oilAnalysisSettingsService = new OilAnalysisSettingsService(
  new OilAnalysisSettingsRepository(),
);
