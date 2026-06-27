# SECURITY_GUIDE.md

# ACC Reliability Platform — Security Guide

Version: 1.0  
Status: Active

---

## Fundamental Rules

- **Never hardcode secrets.** Passwords, API keys, tokens, service account credentials, and connection strings must never appear in source code.
- **Authentication and authorization belong to Platform Services.** Business modules do not implement auth logic — they consume it via the Platform SDK.
- **Contractor isolation is always enforced.** No query, operation, or response may mix data across contractor boundaries.

---

## Forbidden in Source Code

The following must never appear in any file committed to the repository:

| Type | Examples |
|---|---|
| Passwords | database passwords, admin passwords |
| API keys | Google API keys, service account keys |
| Tokens | OAuth tokens, session tokens, bearer tokens |
| Connection strings | JDBC URLs with credentials, Sheets IDs with embedded auth |
| Service account JSON | Google service account credential files |
| Private keys | PEM-encoded keys, SSH keys |

If a secret is discovered in the codebase: stop work, notify the responsible engineer immediately, rotate the secret, and remove it from history.

---

## How to Handle Credentials

| Scenario | Approach |
|---|---|
| Runtime environment (Node.js) | `ACC_*` environment variables (never logged) |
| Google Apps Script | `PropertiesService.getScriptProperties()` |
| CI / deployment | Secrets manager (GitHub Actions secrets, etc.) |
| Local development | `.env` file — must be in `.gitignore` |

The `ACC_*` environment variable namespace is reserved for platform configuration (see [PLATFORM_KERNEL_REFERENCE.md](./PLATFORM_KERNEL_REFERENCE.md)). Credentials use the same namespace convention but are never loaded into `PlatformConfig` — they are consumed directly by the service that needs them.

---

## Authentication

Authentication is a Platform Service responsibility. The current contractors and their identities:

- **ACC** — platform owner
- **RHI** — contractor
- **ASEC** — contractor

Business modules must:
1. Receive the authenticated user/contractor context via dependency injection (constructor parameter or method argument).
2. Never derive contractor identity from user input directly.
3. Never bypass the Platform auth layer.

---

## Contractor Isolation

Every data access method in every repository must accept and enforce `contractorId`. This is not optional.

```typescript
// Correct — contractor isolation enforced
async findAll(contractorId: ContractorId): Promise<OilRecord[]>

// Wrong — no isolation
async findAll(): Promise<OilRecord[]>
```

Any query that does not filter by `contractorId` is a data leak and must not be merged.

---

## Authorization

Platform Services are responsible for role-based access control (RBAC). Modules consume authorization decisions:

```typescript
// Module asks the platform: "can this user do this?"
const canWrite = await authService.can(user, 'oil-lubrication:records:write');
if (!canWrite) {
  throw new PermissionError('Insufficient permissions', { userId: user.id });
}
```

Modules must not implement authorization logic internally.

---

## Logging and Secrets

Secrets must never appear in log output. When logging context objects, ensure no credential fields are included. The logger does not redact automatically.

```typescript
// Bad — may log sensitive data
this.logger.debug('Config loaded', { ...config });

// Good — log only safe fields
this.logger.debug('Config loaded', {
  platformName: config.platformName,
  environment: config.environment,
});
```

---

## Input Validation

Validate all external input at the boundary of the system (API handlers, form submissions). Use typed interfaces and runtime validation. Never trust client-supplied IDs without verifying they belong to the authenticated contractor.

---

## Dependency Security

- Keep dependencies updated. Outdated packages are a security risk.
- Avoid adding dependencies with no clear justification. Fewer dependencies mean a smaller attack surface.
- Do not add dependencies that replicate existing platform capabilities.

---

## Related Documents

- [PLATFORM_KERNEL_REFERENCE.md](./PLATFORM_KERNEL_REFERENCE.md) — configuration and environment variables
- [STORAGE_ABSTRACTION_GUIDE.md](./STORAGE_ABSTRACTION_GUIDE.md) — contractor isolation in storage
- [MODULE_DEVELOPMENT_GUIDE.md](./MODULE_DEVELOPMENT_GUIDE.md) — consuming auth via Platform SDK
- [AI_DEVELOPMENT_GUIDE.md](./AI_DEVELOPMENT_GUIDE.md) — engineering rules

---

*End of document.*
