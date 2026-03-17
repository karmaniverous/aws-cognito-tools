---
title: get-dotenv plugin
---

# get-dotenv plugin

This guide explains the get-dotenv cognito plugin exported by this package:

- `cognitoPlugin()` → mounts under `aws` and provides:
  - `aws cognito pull`
  - `aws cognito purge`

If you want the programmatic API instead, see the [AwsCognitoTools guide](aws-cognito-tools.md).

## Install and import

```bash
npm i @karmaniverous/aws-cognito-tools
```

You can either:

- Use the shipped CLI (`aws-cognito-tools`), or
- Embed `cognitoPlugin()` inside your own get-dotenv host.

## Using the shipped CLI

The shipped CLI is a get-dotenv CLI host composed with aws + cognito:

```bash
aws-cognito-tools --env dev aws cognito pull --client-name web-app
aws-cognito-tools --env dev aws cognito purge --force
```

Notes:

- `--env` is a get-dotenv root option and must appear before `aws ...`.
- The plugin expands `--pool-id` and `--client-name` at action time against `{ ...process.env, ...ctx.dotenv }` (ctx.dotenv wins).

## Embedding the plugin in your own host

Mount the plugin under `aws`:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import { cognitoPlugin } from '@karmaniverous/aws-cognito-tools';

await createCli({
  alias: 'smoz',
  compose: (program) => program.use(awsPlugin().use(cognitoPlugin())),
})();
```

Region sourcing:

- The plugin reads the effective region from the `aws` plugin's published ctx state (`ctx.plugins.aws.region`) when available.
- Credentials are expected to come from the standard AWS SDK v3 provider chain (the parent `aws` plugin may export them into `process.env` depending on its configuration).

## `aws cognito pull`

Pull resolves a User Pool and Client, then writes configured env vars to local dotenv files using JSONPath mappings.

### Configuration

Configure mappings in your get-dotenv config under `plugins['aws/cognito']`:

```json
{
  "pull": {
    "mappings": {
      "env": {
        "public": {
          "COGNITO_USER_POOL_ID": "$.userPool.Id",
          "COGNITO_CLIENT_ID": "$.userPoolClient.ClientId",
          "COGNITO_REGION": "$.region"
        },
        "private": {
          "COGNITO_CLIENT_SECRET": "$.userPoolClient.ClientSecret"
        }
      }
    }
  }
}
```

The source object resolved against is:

```ts
{
  userPool: DescribeUserPoolResponse.UserPool,
  userPoolClient: DescribeUserPoolClientResponse.UserPoolClient,
  region: string
}
```

### CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `--pool-id` | `$COGNITO_USER_POOL_ID` | User Pool ID (supports `$VAR` expansion) |
| `--client-name` | `$COGNITO_USER_POOL_CLIENT_NAME` | Client name to find and describe |
| `--template-extension` | `template` | Dotenv template extension for missing files |
| `--include` | none | Space-delimited keys to include (mutually exclusive with `--exclude`) |
| `--exclude` | none | Space-delimited keys to exclude (mutually exclusive with `--include`) |

### Flow

1. Resolve User Pool (by explicit ID, env var, or naming convention)
2. Find User Pool Client by `--client-name` (paginated search)
3. Describe both → build source object
4. Walk CognitoMappings: for each `scope → privacy → envVar → jsonPath`, resolve the JSONPath
5. Apply `--include`/`--exclude` filtering
6. Write to dotenv files via `editDotenvFile` with get-dotenv precedence

## `aws cognito purge`

Purge deletes all users from a Cognito User Pool. This is a **destructive** operation.

### CLI options

| Option | Default | Description |
|--------|---------|-------------|
| `--pool-id` | `$COGNITO_USER_POOL_ID` | User Pool ID (supports `$VAR` expansion) |
| `--force` | `false` | Required to confirm deletion |

### Flow

1. Resolve User Pool
2. Log estimated user count
3. Delete all users in batches (fresh-list batching for safety)
4. Log each deletion with running count

Without `--force`, the command throws an error and does not proceed.

## Plugin configuration

Full config schema (all optional):

```json
{
  "userPoolId": "$COGNITO_USER_POOL_ID",
  "clientName": "$COGNITO_USER_POOL_CLIENT_NAME",
  "templateExtension": "template",
  "pull": {
    "mappings": { ... },
    "include": ["KEY1", "KEY2"],
    "exclude": ["SECRET_KEY"]
  }
}
```

CLI flags always override config values. Config values override defaults.
