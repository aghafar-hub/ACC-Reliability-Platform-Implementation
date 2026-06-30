// platform/sdk/src/impl/health-client-impl.ts
// Concrete IHealthClient — thin delegate to IHealthService.

import type {
  HealthCheckResult,
  HealthComponentRegistration,
  HealthComponentStatus,
  HealthSummary,
  IHealthService,
} from '@acc-reliability/services';
import type { IHealthClient } from '../clients/health-client';

/**
 * Health client backed by the platform {@link IHealthService}.
 *
 * All methods are direct pass-throughs; no caching, no transformation.
 * Registered under `sdk.health` in the DI container and exposed via
 * {@link IPlatformSdk.health}.
 */
export class HealthClientImpl implements IHealthClient {
  constructor(private readonly service: IHealthService) {}

  register(registration: HealthComponentRegistration): void {
    this.service.register(registration);
  }

  unregister(componentId: string): void {
    this.service.unregister(componentId);
  }

  async check(componentId: string): Promise<HealthCheckResult> {
    return this.service.check(componentId);
  }

  async checkAll(): Promise<readonly HealthCheckResult[]> {
    return this.service.checkAll();
  }

  getStatus(componentId: string): HealthComponentStatus | null {
    return this.service.getStatus(componentId);
  }

  getSummary(): HealthSummary {
    return this.service.getSummary();
  }

  isHealthy(): boolean {
    return this.service.isHealthy();
  }
}
