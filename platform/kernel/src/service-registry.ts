// platform/kernel/src/service-registry.ts

import { RegistryError } from './errors';
import type { ILogger } from './logger';

export interface ServiceDescriptor<T = unknown> {
  serviceId: string;
  displayName: string;
  instance: T;
  registeredAt: string;
}

export interface IServiceRegistry {
  register<T>(serviceId: string, displayName: string, instance: T): void;
  get<T>(serviceId: string): T;
  has(serviceId: string): boolean;
  list(): ReadonlyArray<Omit<ServiceDescriptor, 'instance'>>;
}

export class ServiceRegistry implements IServiceRegistry {
  private readonly services = new Map<string, ServiceDescriptor>();
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  register<T>(serviceId: string, displayName: string, instance: T): void {
    if (this.services.has(serviceId)) {
      throw new RegistryError(
        `Service "${serviceId}" is already registered. Use a unique serviceId.`,
        { serviceId }
      );
    }

    const descriptor: ServiceDescriptor<T> = {
      serviceId,
      displayName,
      instance,
      registeredAt: new Date().toISOString(),
    };

    this.services.set(serviceId, descriptor as ServiceDescriptor);
    this.logger.debug('Service registered', { serviceId, displayName });
  }

  get<T>(serviceId: string): T {
    const descriptor = this.services.get(serviceId);
    if (!descriptor) {
      throw new RegistryError(
        `Service "${serviceId}" is not registered.`,
        { serviceId, available: this.serviceIds() }
      );
    }
    return descriptor.instance as T;
  }

  has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  list(): ReadonlyArray<Omit<ServiceDescriptor, 'instance'>> {
    return Array.from(this.services.values()).map(({ serviceId, displayName, registeredAt }) => ({
      serviceId,
      displayName,
      registeredAt,
    }));
  }

  private serviceIds(): string[] {
    return Array.from(this.services.keys());
  }
}
