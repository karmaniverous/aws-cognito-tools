---
title: AwsCognitoTools
---

# AwsCognitoTools (programmatic API)

`AwsCognitoTools` is an X-Ray-enabled wrapper around the AWS Cognito Identity Provider SDK v3 client. It provides composite convenience methods for operations that compose multiple SDK calls, while exposing the raw client for single-operation use.

## Constructor

```ts
import { AwsCognitoTools } from '@karmaniverous/aws-cognito-tools';

const tools = new AwsCognitoTools({
  clientConfig: {
    region: 'us-east-1',
    logger: console,
  },
  xray: 'auto', // 'auto' | 'on' | 'off'
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientConfig` | `CognitoIdentityProviderClientConfig` | `{}` | AWS SDK v3 client config (region, credentials, logger, etc.) |
| `xray` | `'auto' \| 'on' \| 'off'` | `'auto'` | X-Ray capture mode. `auto` enables only when `AWS_XRAY_DAEMON_ADDRESS` is set. |

### Public properties

| Property | Type | Description |
|----------|------|-------------|
| `client` | `CognitoIdentityProviderClient` | The effective SDK client (X-Ray-captured when enabled). |
| `clientConfig` | `CognitoIdentityProviderClientConfig` | The resolved config used to build the client. |
| `logger` | `Logger` | Validated logger instance. |
| `xray` | `XrayState` | Materialized X-Ray state (`{ mode, enabled, daemonAddress? }`). |

## Convenience methods

### `resolveUserPool(options?)`

Discover a User Pool by explicit ID, environment variable, or naming convention.

```ts
// By explicit ID
const pool = await tools.resolveUserPool({ poolId: 'us-east-1_abc123' });

// By COGNITO_USER_POOL_ID env var (automatic)
const pool = await tools.resolveUserPool();

// By naming convention: finds pool matching *-dev
const pool = await tools.resolveUserPool({ env: 'dev' });
```

### `listAllUsers(options)`

Auto-paginated user listing with guardrails.

```ts
const users = await tools.listAllUsers({
  userPoolId: pool.Id!,
  maxResults: 500,    // stop after 500 users
  maxPages: 10,       // stop after 10 pages
  filter: "email ^= \"test\"",  // Cognito filter syntax
  onPage: (users, page) => console.log(`Page ${page}: ${users.length}`),
});
```

### `purgeAllUsers(options?)`

Delete all users from a pool. Uses fresh-list batching for safety.

```ts
const count = await tools.purgeAllUsers({
  userPoolId: pool.Id!,
});
console.log(`Deleted ${count} users.`);

// Or with auto-resolution:
const count = await tools.purgeAllUsers({ env: 'dev' });
```

## Escape hatch

For any Cognito operation not wrapped by a convenience method, use `tools.client` directly:

```ts
import {
  AdminGetUserCommand,
  AdminCreateUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Get a user
const user = await tools.client.send(
  new AdminGetUserCommand({
    UserPoolId: pool.Id!,
    Username: 'jane@example.com',
  }),
);

// Create a user
await tools.client.send(
  new AdminCreateUserCommand({
    UserPoolId: pool.Id!,
    Username: 'new-user@example.com',
    UserAttributes: [
      { Name: 'email', Value: 'new-user@example.com' },
      { Name: 'email_verified', Value: 'true' },
    ],
  }),
);
```

The client is fully configured with your region, credentials, logger, and X-Ray capture — you get all of that for free.

## Non-Lambda usage

`AwsCognitoTools` works anywhere Node.js runs — it's not Lambda-specific:

```ts
// In a script
const tools = new AwsCognitoTools({
  clientConfig: { region: 'us-east-1' },
  xray: 'off', // no X-Ray daemon outside Lambda
});

// In an Express server
app.get('/admin/users', async (req, res) => {
  const tools = new AwsCognitoTools({ xray: 'off' });
  const users = await tools.listAllUsers({ userPoolId: POOL_ID });
  res.json(users);
});
```
