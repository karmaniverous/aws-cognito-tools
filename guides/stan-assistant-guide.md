---
title: AI Assistant Guide
---

# aws-cognito-tools — AI Assistant Guide

This guide explains the codebase structure and conventions to AI coding assistants working on this project.

## Architecture

Three-layer pattern (same as `aws-secrets-manager-tools`):

```
src/
  cognitoTools/           ← Layer 1: Runtime wrapper
    AwsCognitoTools.ts      Core class (constructor + convenience methods)
    AwsCognitoTools.test.ts Unit tests (mocked SDK)
    awsError.ts             Error classification (isAwsErrorOfType factory)
    awsError.test.ts        Error tests

  cognitoPlugin/          ← Layer 2: get-dotenv plugin
    cognitoPlugin.ts        Plugin registration (definePlugin, ns: 'cognito')
    cognitoPluginConfig.ts  Zod schema + CognitoMappings type
    cognitoPluginConfig.test.ts
    resolveUserPool.ts      Shared pool discovery for commands
    resolveMapping.ts       JSONPath dot-notation resolver
    resolveMapping.test.ts
    commands/
      types.ts              CLI + plugin API type aliases
      registerPullCommand.ts
      registerPurgeCommand.ts

  cli/
    aws-cognito-tools/    ← Layer 3: Standalone CLI
      index.ts              Embeds get-dotenv host + cognitoPlugin

  index.ts                ← Public API surface
```

## Key conventions

1. **Composite methods only** — `AwsCognitoTools` wraps multi-call operations. Single-call operations use `tools.client.send()`.

2. **Error classification** — `awsError.ts` uses an `isAwsErrorOfType` factory. Add new types with one line.

3. **Plugin options** — All CLI options use `createPluginDynamicOption` so `--help` shows composed defaults from config.

4. **JSONPath resolution** — `resolveMapping.ts` handles `$.dot.notation` paths with fail-fast on undefined.

5. **Pagination** — All list operations (pools, users, clients) paginate via tokens. `purgeAllUsers` uses fresh-list batching (no token reuse after deletions).

6. **DRY helpers**:
   - `describePool` (private) — shared DescribeUserPool + error handling
   - `resolveUserPoolForCommand` — shared pool resolution for CLI commands
   - `resolveIncludeExclude` — shared CLI/config include/exclude logic

7. **Testing** — All SDK calls are mocked via `vi.fn()`. No AWS credentials needed for unit tests.

## Quality gates

Every PR must pass: `build`, `lint`, `typecheck`, `test`, `knip` — zero errors, zero warnings.

## References

- [Dev Spec](https://jeeves.johngalt.id/browse/j/domains/projects/smoz/cognito/dev-spec.md) — design rationale and decisions
- [Dev Plan](https://jeeves.johngalt.id/browse/j/domains/projects/smoz/cognito/dev-plan.md) — task breakdown and status
- Reference implementation: `@karmaniverous/aws-secrets-manager-tools`
