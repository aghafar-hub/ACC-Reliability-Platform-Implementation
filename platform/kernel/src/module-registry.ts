// platform/kernel/src/module-registry.ts

import { ModuleError, RegistryError } from './errors';
import type { ILogger } from './logger';

export type ModuleStatus =
  | 'registered'
  | 'enabled'
  | 'disabled'
  | 'maintenance'
  | 'failed';

export interface ModuleDescriptor {
  moduleId: string;
  displayName: string;
  version: string;
  status: ModuleStatus;
  registeredAt: string;
  updatedAt: string;
}

export interface IModuleRegistry {
  register(moduleId: string, displayName: string, version: string): void;
  enable(moduleId: string): void;
  disable(moduleId: string): void;
  setStatus(moduleId: string, status: ModuleStatus): void;
  getStatus(moduleId: string): ModuleStatus;
  get(moduleId: string): Readonly<ModuleDescriptor>;
  list(): ReadonlyArray<Readonly<ModuleDescriptor>>;
  has(moduleId: string): boolean;
}

export class ModuleRegistry implements IModuleRegistry {
  private readonly modules = new Map<string, ModuleDescriptor>();
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  register(moduleId: string, displayName: string, version: string): void {
    if (this.modules.has(moduleId)) {
      throw new RegistryError(
        `Module "${moduleId}" is already registered.`,
        { moduleId }
      );
    }

    const now = new Date().toISOString();
    const descriptor: ModuleDescriptor = {
      moduleId,
      displayName,
      version,
      status: 'registered',
      registeredAt: now,
      updatedAt: now,
    };

    this.modules.set(moduleId, descriptor);
    this.logger.debug('Module registered', { moduleId, displayName, version });
  }

  enable(moduleId: string): void {
    this.setStatus(moduleId, 'enabled');
  }

  disable(moduleId: string): void {
    this.setStatus(moduleId, 'disabled');
  }

  setStatus(moduleId: string, status: ModuleStatus): void {
    const descriptor = this.getDescriptor(moduleId);

    if (descriptor.status === 'failed' && status !== 'disabled') {
      throw new ModuleError(
        `Module "${moduleId}" is in a failed state. It can only be disabled.`,
        { moduleId, currentStatus: descriptor.status, requestedStatus: status }
      );
    }

    descriptor.status = status;
    descriptor.updatedAt = new Date().toISOString();

    this.logger.debug('Module status updated', { moduleId, status });
  }

  getStatus(moduleId: string): ModuleStatus {
    return this.getDescriptor(moduleId).status;
  }

  get(moduleId: string): Readonly<ModuleDescriptor> {
    return this.getDescriptor(moduleId);
  }

  list(): ReadonlyArray<Readonly<ModuleDescriptor>> {
    return Array.from(this.modules.values());
  }

  has(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  private getDescriptor(moduleId: string): ModuleDescriptor {
    const descriptor = this.modules.get(moduleId);
    if (!descriptor) {
      throw new RegistryError(
        `Module "${moduleId}" is not registered.`,
        { moduleId, registered: Array.from(this.modules.keys()) }
      );
    }
    return descriptor;
  }
}
