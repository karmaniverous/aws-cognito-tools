# Requirements

> Detailed requirements live in the [dev-spec](https://jeeves.johngalt.id/browse/j/domains/projects/smoz/cognito/dev-spec.md).

## Layer 1 — Runtime Wrapper

- Constructor mirrors `AwsSecretsManagerTools`: assertLogger → effectiveClientConfig → X-Ray capture → public readonly properties
- 3 convenience methods: `resolveUserPool`, `listAllUsers` (with guardrails), `purgeAllUsers`
- `awsError.ts` for Cognito-specific error classification
- Escape hatch via `tools.client` for all single-operation SDK calls

## Layer 2 — get-dotenv Plugin

- Mount under `aws cognito` namespace
- `pull` command: pool + client discovery → CognitoMappings JSONPath resolution → editDotenvFile write
- `purge` command: pool discovery → confirmation → delete loop
- Config-driven CognitoMappings type: `Record<DotEnvTargetScope, Record<DotenvTargetPrivacy, Record<string, string>>>`
- JSONPath resolver: resolve → coerce to string → throw on undefined
- `templateExtension` defaults from get-dotenv root config
- `createPluginDynamicOption` for all CLI options
- `--include`/`--exclude` mutual exclusion for key filtering

## Layer 3 — Standalone CLI

- Entry point at `src/cli/aws-cognito-tools/index.ts`
- Embeds get-dotenv host + cognitoPlugin
- `bin` entry in package.json points to `dist/cli/aws-cognito-tools/index.js`
