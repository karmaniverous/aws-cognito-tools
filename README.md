# AWS Cognito Tools

Tools and a get-dotenv plugin for working with AWS Cognito User Pools.

This package provides:

- A tools-style wrapper that owns AWS client setup (including optional AWS X-Ray capture):
  - `AwsCognitoTools`
- A get-dotenv plugin intended to be mounted under `aws`:
  - `cognitoPlugin()` → `aws cognito pull|purge`
- A CLI embedding get-dotenv with the cognito plugin:
  - `aws-cognito-tools`

## Documentation

- Learn the programmatic API: [AwsCognitoTools guide](guides/aws-cognito-tools.md)
- Browse the generated API reference: [TypeDoc site](https://docs.karmanivero.us/aws-cognito-tools)

## Install

```bash
npm i @karmaniverous/aws-cognito-tools
```

This package is ESM-only (Node >= 22).

## Quick start (programmatic)

```ts
import { AwsCognitoTools } from '@karmaniverous/aws-cognito-tools';

const tools = new AwsCognitoTools({
  clientConfig: { region: 'us-east-1', logger: console },
  xray: 'auto',
});

// Resolve a User Pool by environment naming convention
const pool = await tools.resolveUserPool({ env: 'dev' });

// List all users with pagination guardrails
const users = await tools.listAllUsers({
  userPoolId: pool.Id!,
  maxResults: 100,
  onPage: (page, num) => console.log(`Page ${num}: ${page.length} users`),
});

// Escape hatch: use the fully configured SDK client directly
import { AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
const user = await tools.client.send(
  new AdminGetUserCommand({ UserPoolId: pool.Id!, Username: 'jane@example.com' }),
);
```

## Quick start (smoz plugin)

Mount in your get-dotenv CLI:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import { cognitoPlugin } from '@karmaniverous/aws-cognito-tools';

await createCli({
  alias: 'smoz',
  compose: (program) =>
    program.use(awsPlugin().use(cognitoPlugin())),
})();
```

Then use the CLI:

```bash
# Pull Cognito pool + client config into local .env files
smoz --env dev aws cognito pull --client-name my-app-client-dev

# Purge all users from a dev pool (DESTRUCTIVE)
smoz --env dev aws cognito purge --force
```

## Quick start (standalone CLI)

```bash
aws-cognito-tools --env dev aws cognito pull --client-name my-app-client-dev
aws-cognito-tools --env dev aws cognito purge --force
```

Notes:

- `--env` is a root-level (get-dotenv) option and must appear before the command path.
- Pool ID and client name support `$VAR` expansion evaluated at action time against `{ ...process.env, ...ctx.dotenv }`.

## Pull command — CognitoMappings

The `pull` command resolves a User Pool and Client, then writes configured env vars to local dotenv files using JSONPath mappings.

Configure mappings in your get-dotenv config under `plugins['aws/cognito']`:

```json
{
  "pull": {
    "mappings": {
      "env": {
        "public": {
          "NEXT_PUBLIC_COGNITO_CLIENT_ID": "$.userPoolClient.ClientId",
          "NEXT_PUBLIC_COGNITO_DOMAIN": "$.userPool.Domain",
          "COGNITO_REGION": "$.region",
          "COGNITO_USER_POOL_ID": "$.userPool.Id"
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
{ userPool, userPoolClient, region }
```

## AWS X-Ray capture (optional)

X-Ray support is guarded:

- Default behavior is `xray: 'auto'`: capture is enabled only when `AWS_XRAY_DAEMON_ADDRESS` is set.
- To enable capture, install the optional peer dependency: `aws-xray-sdk`
- In `auto` mode, if `AWS_XRAY_DAEMON_ADDRESS` is set but `aws-xray-sdk` is not installed, construction throws.

See [@karmaniverous/aws-xray-tools](https://github.com/karmaniverous/aws-xray-tools) for details.

---

See [CHANGELOG](./CHANGELOG.md) for release history.
