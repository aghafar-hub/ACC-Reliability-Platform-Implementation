// apps/owner-center/src/types/learning-types.ts
// Learning Center foundation types for the Owner Center shell.
//
// Module owners register LearningTopic entries against their moduleId.
// The shell assembles a LearningCatalog and filters by the active user role
// and locale.  No rendering logic lives here — types only.

// ── Locale support ────────────────────────────────────────────────────────────

/** Locales supported by the Learning Center. */
export type SupportedLocale = 'en' | 'ar';

/**
 * Locale-keyed content wrapper.
 * English is required; Arabic is optional for modules that have not yet
 * provided a translation.
 */
export type LocalizedContent<T> = {
  readonly en: T;
  readonly ar?: T | undefined;
};

// ── Role audience ─────────────────────────────────────────────────────────────

/**
 * User roles that a learning topic is relevant to.
 * A topic may target multiple roles.
 *
 * Values align with the platform AppRole enum in @acc-reliability/sdk;
 * expressed as a string union here to avoid a platform dependency inside the
 * shell's pure-type layer.
 */
export type LearningAudienceRole =
  | 'owner'
  | 'supervisor'
  | 'technician'
  | 'admin'
  | 'viewer';

// ── Learning topic ────────────────────────────────────────────────────────────

/** Unique, stable identifier for a learning topic. */
export type LearningTopicId = string & { readonly __brand: 'LearningTopicId' };

/**
 * A single help/learning article owned by one platform module.
 *
 * Topics are registered by module owners; the shell renders them inside
 * the Learning Center panel without knowing their content.
 */
export interface LearningTopic {
  /** Stable, unique id scoped to the owning module (e.g. 'oil-lube:first-record'). */
  readonly id: LearningTopicId;
  /** Platform module that owns and maintains this topic. */
  readonly moduleId: string;
  /** Roles this topic is relevant to. Empty array means visible to all roles. */
  readonly audience: readonly LearningAudienceRole[];
  /** Display title in supported locales. */
  readonly title: LocalizedContent<string>;
  /**
   * Body content in supported locales.
   * Plain text or simple markdown — no HTML.
   */
  readonly body: LocalizedContent<string>;
  /**
   * Optional URL to a more detailed external or internal help page.
   * Shell renders this as a "Read more" link when present.
   */
  readonly learnMoreUrl?: string | undefined;
}

// ── Learning catalog ──────────────────────────────────────────────────────────

/**
 * The assembled collection of all registered learning topics.
 * Built at runtime by the shell from module-provided topic arrays.
 */
export interface LearningCatalog {
  readonly topics: readonly LearningTopic[];
}

/** Empty catalog — default before any module registers topics. */
export const EMPTY_LEARNING_CATALOG: LearningCatalog = {
  topics: [],
} as const;
