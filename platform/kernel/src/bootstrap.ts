// platform/kernel/src/bootstrap.ts

import { PlatformLogger } from './logger';
import { ServiceRegistry } from './service-registry';
import { ModuleRegistry } from './module-registry';
import { createPlatformContext } from './platform-context';
import { PlatformError } from './errors';
import { ConfigManager } from './config/config-manager';
import { LocalEventBus } from './events/local-event-bus';
import { LifecycleManager } from './lifecycle/lifecycle-manager';

import type { PlatformContext } from './platform-context';

export interface BootstrapResult {
  context: Readonly<PlatformContext>;
  /** Wall-clock milliseconds taken for bootstrap to complete. */
  durationMs: number;
}

/**
 * bootstrapPlatform()
 *
 * The single entry-point to start the ACC Reliability Platform kernel.
 * Call this once at application startup — never more than once.
 *
 * Returns a frozen PlatformContext ready to be passed to services,
 * modules, and adapters via dependency injection.
 *
 * Throws PlatformError (or a subclass) on any failure.
 */
export async function bootstrapPlatform(): Promise<BootstrapResult> {
  const startedAt = Date.now();

  // ── Step 1: Early logger (pre-config, uses defaults) ─────────────────────
  const earlyLogger = new PlatformLogger({ prefix: '[Kernel:Boot]' });
  earlyLogger.info('Platform bootstrap starting…');

  try {
    // ── Step 2: Load and validate configuration via ConfigManager ─────────
    earlyLogger.debug('Initializing configuration manager…');
    const configManager = new ConfigManager(earlyLogger);
    const config = await configManager.load();

    // ── Step 3: Create production logger using resolved logging config ──────
    const logger = new PlatformLogger({
      prefix:   config.logging.prefix,
      minLevel: config.logging.level,
    });

    // ── Step 4: Initialize registries ─────────────────────────────────────
    logger.debug('Initializing service registry…');
    const serviceRegistry = new ServiceRegistry(logger);

    logger.debug('Initializing module registry…');
    const moduleRegistry = new ModuleRegistry(logger);

    // ── Step 5: Register kernel-provided services ─────────────────────────
    // The logger, config manager, and event bus are registered so downstream
    // platform code can resolve them via the service registry.
    serviceRegistry.register('platform.logger',         'Platform Logger',                  logger);
    serviceRegistry.register('platform.config',         'Platform Config',                  config);
    serviceRegistry.register('platform.configManager',  'Platform Config Manager',          configManager);
    serviceRegistry.register('platform.eventBus',       'Platform Event Bus (Local)',       new LocalEventBus());

    const lifecycleManager = new LifecycleManager({
      logger,
      serviceRegistry,
    });
    serviceRegistry.register('platform.lifecycle', 'Platform Lifecycle Manager', lifecycleManager);

    // ── Step 6: Build and freeze PlatformContext ───────────────────────────
    logger.debug('Creating platform context…');
    const context = createPlatformContext({
      platformName: config.platform.name,
      version:      config.platform.version,
      environment:  config.platform.environment,
      services:     serviceRegistry,
      modules:      moduleRegistry,
    });

    // ── Step 7: Mark kernel services as running ────────────────────────────
    // Transition from 'registered' → 'running' now that the context is ready.
    serviceRegistry.setStatus('platform.logger',        'running');
    serviceRegistry.setStatus('platform.config',        'running');
    serviceRegistry.setStatus('platform.configManager', 'running');
    serviceRegistry.setStatus('platform.eventBus',      'running');
    serviceRegistry.setStatus('platform.lifecycle',     'running');

    const durationMs = Date.now() - startedAt;

    logger.info('Platform bootstrap complete ✓', {
      correlationId: context.correlationId,
      initializedAt: context.initializedAt,
      environment:   config.platform.environment,
      storage:       config.storage.provider,
      durationMs,
    });

    return { context, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    if (error instanceof PlatformError) {
      earlyLogger.error('Platform bootstrap failed', {
        ...error.toJSON(),
        durationMs,
      });
      throw error;
    }

    // Wrap unexpected errors
    const message =
      error instanceof Error ? error.message : 'Unknown bootstrap failure';
    earlyLogger.error('Platform bootstrap failed with unexpected error', {
      message,
      durationMs,
    });
    throw new PlatformError(message, 'BOOTSTRAP_FAILURE', { durationMs });
  }
}
