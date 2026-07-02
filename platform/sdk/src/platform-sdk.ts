// platform/sdk/src/platform-sdk.ts
// Main Platform SDK facade interface.
//
// IPlatformSdk is the single object a business module receives from the
// platform.  Modules import only this interface and the types they need;
// they never reference kernel, services, or storage packages directly
// (PS-114 §1, SDK-002).

import type { IAuthClient } from './clients/auth-client';
import type { IPermissionsClient } from './clients/permissions-client';
import type { INotificationsClient } from './clients/notifications-client';
import type { IActionsClient } from './clients/actions-client';
import type { IAuditClient } from './clients/audit-client';
import type { IStorageClient } from './clients/storage-client';
import type { IWorkflowClient } from './clients/workflow-client';
import type { IConfigClient } from './clients/config-client';
import type { IHealthClient } from './clients/health-client';
import type { IMetricsClient } from './clients/metrics-client';
import type { IUserClient } from './clients/user-client';
import type { IContractorClient } from './clients/contractor-client';
import type { IModuleClient } from './clients/module-client';
import type { INotificationManagementClient } from './clients/notification-management-client';
import type { IReportingClient } from './clients/reporting-client';
import type { IWorkflowsClient } from './clients/workflows-client';
import type { IEquipmentClient } from './clients/equipment-client';
import type { ILubricationPointClient } from './clients/lubrication-point-client';
import type { SdkContext } from './sdk-context';

/**
 * Platform SDK facade — the only approved integration point for business modules.
 *
 * The platform runtime creates one `IPlatformSdk` instance per module per
 * session and passes it to the module's initialization function.  Each
 * property is a fully typed client interface; modules interact exclusively
 * through these clients.
 *
 * Architectural rules (PS-114):
 *  - Modules must never import from `@acc-reliability/kernel`.
 *  - Modules must never import from `@acc-reliability/services` directly.
 *  - Modules must never import from `@acc-reliability/storage` directly.
 *  - Modules must never call platform services through any path other than
 *    the clients on this interface.
 *
 * If the platform implementation changes internally, modules continue to
 * operate through the same SDK contracts without modification.
 */
export interface IPlatformSdk {
  /**
   * Authentication client — sign-in, sign-out, session management.
   * See PS-101, PS-114 §5.
   */
  readonly auth: IAuthClient;

  /**
   * Permissions and authorization client — role checks, permission checks,
   * feature flags.  See PS-103, PS-114 §6.
   */
  readonly permissions: IPermissionsClient;

  /**
   * Notification client — send, acknowledge, dismiss notifications.
   * See PS-114 §10.
   */
  readonly notifications: INotificationsClient;

  /**
   * Action center client — create, update, close, and link platform actions.
   * See PS-114 §9.
   */
  readonly actions: IActionsClient;

  /**
   * Audit log client — write structured audit records.
   * See PS-110, PS-114 §13.
   */
  readonly audit: IAuditClient;

  /**
   * Storage client — contractor-scoped entity repositories.
   * See PS-114 §2, DB-002.
   */
  readonly storage: IStorageClient;

  /**
   * Workflow engine client — start and observe business workflow instances.
   * See PS-116, PS-114 §2.
   */
  readonly workflow: IWorkflowClient;

  /**
   * Configuration client — read platform and module settings.
   * See PS-114 §7.
   */
  readonly config: IConfigClient;

  /**
   * Health monitoring client — register component checks, query platform
   * health status.  See PS-108.
   */
  readonly health: IHealthClient;

  /**
   * Telemetry client — register metrics, record observations, query snapshots.
   * See PS-109.
   */
  readonly metrics: IMetricsClient;

  /**
   * User Management client — create, update, archive, restore, suspend, activate users.
   * Manages role assignments including temporary and delegated roles.
   * Authentication-provider-agnostic; does not implement sign-in or sessions.
   */
  readonly users: IUserClient;

  /**
   * Contractor Management client — create, update, activate, deactivate, archive,
   * restore contractor organizations.
   */
  readonly contractors: IContractorClient;

  /**
   * Module Registry client — register, update, enable, disable, maintenance,
   * retire, restore platform modules.
   */
  readonly modules: IModuleClient;

  /**
   * Notification Management client — create, update, enable, disable, archive,
   * restore notification rules, templates, channels, reminders, and escalations.
   * Configuration only; does not send notifications.
   */
  readonly notificationManagement: INotificationManagementClient;

  /**
   * Reporting client — create, update, enable, disable, archive, restore
   * report definitions, categories, templates, export profiles, and schedule profiles.
   * Configuration only; does not execute reports.
   */
  readonly reporting: IReportingClient;

  /**
   * Workflow & Approval client — manage workflow definitions, approval configuration,
   * and basic instance lifecycle.
   */
  readonly workflows: IWorkflowsClient;

  /**
   * Equipment Master client — unified platform equipment registry.
   * Shared by oil-lubrication, oil-analysis, and future modules.
   */
  readonly equipment: IEquipmentClient;

  /**
   * Lubrication Point Master client — unified platform LP registry.
   * Shared by oil-lubrication, oil-analysis, and future modules.
   */
  readonly lubricationPoints: ILubricationPointClient;

  /**
   * Runtime context for the current session — current user, contractor scope,
   * and optional correlation id.
   */
  readonly context: SdkContext;
}
