# aws-cognito-tools

X-Ray-enabled AWS Cognito client wrapper and get-dotenv CLI plugin for the SMOZ ecosystem.

## Three-Layer Pattern

1. **Runtime wrapper** (`AwsCognitoTools`) — X-Ray-instrumented CognitoIdentityProviderClient for Lambda use
2. **get-dotenv plugin** (`cognitoPlugin`) — `aws cognito pull|purge` commands
3. **Standalone CLI** (`aws-cognito-tools`) — embeds get-dotenv host + plugin

## Key Conventions

- Only composite methods (multi-SDK-call operations) get convenience wrappers
- All single-operation calls use `tools.client.send(new XCommand({...}))`
- Region inherited from parent `aws` plugin via `getAwsRegion(ctx)`
- Pull uses config-driven `CognitoMappings` type for env var mapping
- `templateExtension` defaults from get-dotenv root config

## Reference

- [Dev Spec](https://jeeves.johngalt.id/browse/j/domains/projects/smoz/cognito/dev-spec.md)
- [Dev Plan](https://jeeves.johngalt.id/browse/j/domains/projects/smoz/cognito/dev-plan.md)
- Pattern reference: `@karmaniverous/aws-secrets-manager-tools`
