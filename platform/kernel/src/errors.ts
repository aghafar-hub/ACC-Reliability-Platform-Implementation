// platform/kernel/src/errors.ts

/** Base class for all ACC Reliability Platform errors. */
export class PlatformError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown> | undefined;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PlatformError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = context;

    // Preserve prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
    };
    if (this.context !== undefined) {
      base['context'] = this.context;
    }
    return base;
  }
}

/** Thrown when platform configuration is missing or invalid. */
export class ConfigurationError extends PlatformError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a service or module registry operation fails. */
export class RegistryError extends PlatformError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'REGISTRY_ERROR', context);
    this.name = 'RegistryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a module lifecycle operation fails. */
export class ModuleError extends PlatformError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'MODULE_ERROR', context);
    this.name = 'ModuleError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
