// platform/sdk/src/impl/metrics-client-impl.ts
// Concrete IMetricsClient — thin delegate to IMetricsService.

import type {
  IMetricsService,
  MetricDefinition,
  MetricId,
  MetricSample,
  MetricSnapshot,
  MetricSummary,
  MetricTags,
  MetricValue,
} from '@acc-reliability/services';
import type { IMetricsClient } from '../clients/metrics-client';

/**
 * Metrics client backed by the platform {@link IMetricsService}.
 *
 * All methods are direct pass-throughs; no caching, no transformation.
 * Registered under `sdk.metrics` in the DI container and exposed via
 * {@link IPlatformSdk.metrics}.
 */
export class MetricsClientImpl implements IMetricsClient {
  constructor(private readonly service: IMetricsService) {}

  register(definition: MetricDefinition): void {
    this.service.register(definition);
  }

  unregister(metricId: MetricId): void {
    this.service.unregister(metricId);
  }

  record(metricId: MetricId, value: MetricValue, tags?: MetricTags): void {
    if (tags !== undefined) {
      this.service.record(metricId, value, tags);
    } else {
      this.service.record(metricId, value);
    }
  }

  increment(metricId: MetricId, amount?: MetricValue): void {
    if (amount !== undefined) {
      this.service.increment(metricId, amount);
    } else {
      this.service.increment(metricId);
    }
  }

  decrement(metricId: MetricId, amount?: MetricValue): void {
    if (amount !== undefined) {
      this.service.decrement(metricId, amount);
    } else {
      this.service.decrement(metricId);
    }
  }

  timing(metricId: MetricId, durationMs: MetricValue): void {
    this.service.timing(metricId, durationMs);
  }

  getSnapshot(metricId: MetricId): MetricSnapshot | null {
    return this.service.getSnapshot(metricId);
  }

  getAllSnapshots(): readonly MetricSnapshot[] {
    return this.service.getAllSnapshots();
  }

  getSummary(): MetricSummary {
    return this.service.getSummary();
  }

  flush(): readonly MetricSample[] {
    return this.service.flush();
  }
}
