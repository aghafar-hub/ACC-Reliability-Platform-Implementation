// platform/sdk/src/impl/platform-sdk-impl.ts
// Concrete PlatformSdk — the single runtime object passed to business modules.
//
// Construction is handled exclusively by bootstrapPlatformSdk(); modules never
// instantiate this class directly.  All properties are readonly; the SDK
// instance is frozen after construction.

import type { IAuthClient } from '../clients/auth-client';
import type { IPermissionsClient } from '../clients/permissions-client';
import type { INotificationsClient } from '../clients/notifications-client';
import type { IActionsClient } from '../clients/actions-client';
import type { IAuditClient } from '../clients/audit-client';
import type { IStorageClient } from '../clients/storage-client';
import type { IWorkflowClient } from '../clients/workflow-client';
import type { IConfigClient } from '../clients/config-client';
import type { IHealthClient } from '../clients/health-client';
import type { IMetricsClient } from '../clients/metrics-client';
import type { IUserClient } from '../clients/user-client';
import type { IContractorClient } from '../clients/contractor-client';
import type { IModuleClient } from '../clients/module-client';
import type { INotificationManagementClient } from '../clients/notification-management-client';
import type { IReportingClient } from '../clients/reporting-client';
import type { IWorkflowsClient } from '../clients/workflows-client';
import type { SdkContext } from '../sdk-context';
import type { IPlatformSdk } from '../platform-sdk';

// ── Construction params ───────────────────────────────────────────────────────

/**
 * All dependencies required to construct a {@link PlatformSdk} instance.
 * Supplied exclusively by {@link bootstrapPlatformSdk}.
 */
export interface PlatformSdkParams {
  readonly auth: IAuthClient;
  readonly permissions: IPermissionsClient;
  readonly notifications: INotificationsClient;
  readonly actions: IActionsClient;
  readonly audit: IAuditClient;
  readonly storage: IStorageClient;
  readonly workflow: IWorkflowClient;
  readonly config: IConfigClient;
  readonly health: IHealthClient;
  readonly metrics: IMetricsClient;
  readonly users: IUserClient;
  readonly contractors: IContractorClient;
  readonly modules: IModuleClient;
  readonly notificationManagement: INotificationManagementClient;
  readonly reporting: IReportingClient;
  readonly workflows: IWorkflowsClient;
  readonly context: SdkContext;
}

// ── PlatformSdk ───────────────────────────────────────────────────────────────

/**
 * Concrete runtime implementation of the {@link IPlatformSdk} façade.
 *
 * This class is the single object a business module receives from the platform
 * bootstrap.  It holds typed client references and the session context; it
 * never exposes container internals, service registries, or implementation
 * details.
 *
 * The instance is frozen at construction time — no property may be mutated
 * after `bootstrapPlatformSdk()` returns.
 */
export class PlatformSdk implements IPlatformSdk {
  readonly auth: IAuthClient;
  readonly permissions: IPermissionsClient;
  readonly notifications: INotificationsClient;
  readonly actions: IActionsClient;
  readonly audit: IAuditClient;
  readonly storage: IStorageClient;
  readonly workflow: IWorkflowClient;
  readonly config: IConfigClient;
  readonly health: IHealthClient;
  readonly metrics: IMetricsClient;
  readonly users: IUserClient;
  readonly contractors: IContractorClient;
  readonly modules: IModuleClient;
  readonly notificationManagement: INotificationManagementClient;
  readonly reporting: IReportingClient;
  readonly workflows: IWorkflowsClient;
  readonly context: SdkContext;

  constructor(params: PlatformSdkParams) {
    this.auth          = params.auth;
    this.permissions   = params.permissions;
    this.notifications = params.notifications;
    this.actions       = params.actions;
    this.audit         = params.audit;
    this.storage       = params.storage;
    this.workflow      = params.workflow;
    this.config        = params.config;
    this.health        = params.health;
    this.metrics       = params.metrics;
    this.users         = params.users;
    this.contractors   = params.contractors;
    this.modules               = params.modules;
    this.notificationManagement = params.notificationManagement;
    this.reporting               = params.reporting;
    this.workflows               = params.workflows;
    this.context               = params.context;

    Object.freeze(this);
  }
}
