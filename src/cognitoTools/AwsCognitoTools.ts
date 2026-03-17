/**
 * Requirements addressed:
 * - Provide a public tools-style wrapper `AwsCognitoTools`.
 * - Package consumers should not need to construct CognitoIdentityProviderClient;
 *   they should construct `new AwsCognitoTools(...)` and optionally import
 *   AWS SDK Commands for advanced operations.
 * - Expose the fully configured SDK client via `tools.client`.
 * - Support optional AWS X-Ray capture:
 *   - Default "auto": enable only when AWS_XRAY_DAEMON_ADDRESS is set.
 *   - In "auto", if the daemon address is set but aws-xray-sdk is missing,
 *     throw with a clear message.
 * - Enforce the get-dotenv minimal Logger contract (debug/info/warn/error);
 *   validate and throw (no polyfills or proxies).
 * - Provide composite convenience methods only (resolveUserPool, listAllUsers,
 *   purgeAllUsers). All single-operation calls go through tools.client.send().
 */

import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  type CognitoIdentityProviderClientConfig,
  DescribeUserPoolCommand,
  type DescribeUserPoolResponse,
  ListUserPoolsCommand,
  ListUsersCommand,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  captureAwsSdkV3Client,
  shouldEnableXray,
  type XrayMode,
  type XrayState,
} from '@karmaniverous/aws-xray-tools';
import { assertLogger, type Logger } from '@karmaniverous/get-dotenv';

import {
  isResourceNotFoundException,
  isUserNotFoundException,
} from './awsError';

/** Options for {@link AwsCognitoTools} construction. */
export interface AwsCognitoToolsOptions {
  /**
   * AWS SDK v3 Cognito Identity Provider client config.
   *
   * Include advanced settings here (region, credentials, retry config, custom
   * endpoint, etc.). If a logger is provided, it must implement
   * debug/info/warn/error.
   */
  clientConfig?: CognitoIdentityProviderClientConfig;
  /**
   * AWS X-Ray capture mode.
   *
   * - `auto` (default): enable only when `AWS_XRAY_DAEMON_ADDRESS` is set.
   * - `on`: force enable (throws if daemon address is missing).
   * - `off`: disable.
   */
  xray?: XrayMode;
}

/** Options for {@link AwsCognitoTools.resolveUserPool}. */
export interface ResolveUserPoolOptions {
  /** Explicit User Pool ID. When provided, skips discovery. */
  poolId?: string;
  /** Environment name used for name-convention matching (e.g. `dev`, `staging`, `prod`). */
  env?: string;
}

/** Options for {@link AwsCognitoTools.listAllUsers}. */
export interface ListAllUsersOptions {
  /** User Pool ID. */
  userPoolId: string;
  /** Maximum total users to return. When reached, pagination stops. */
  maxResults?: number;
  /** Maximum number of pages to fetch. Safety valve against runaway requests. */
  maxPages?: number;
  /** Optional filter expression (Cognito ListUsers filter syntax). */
  filter?: string;
  /** Callback invoked after each page is fetched. Enables streaming/progress without full buffering. */
  onPage?: (users: UserType[], pageNumber: number) => void;
}

/** Options for {@link AwsCognitoTools.purgeAllUsers}. */
export interface PurgeAllUsersOptions {
  /** User Pool ID. If not provided, `resolveUserPool` is used with `env`. */
  userPoolId?: string;
  /** Environment name for pool resolution (used only when `userPoolId` is not provided). */
  env?: string;
}

/**
 * X-Ray-enabled AWS Cognito Identity Provider wrapper.
 *
 * Provides composite convenience methods for operations that compose multiple
 * SDK calls. All single-operation Cognito calls should use
 * {@link AwsCognitoTools.client} directly with AWS SDK v3 Command classes.
 */
export class AwsCognitoTools {
  /**
   * The effective SDK client (captured when X-Ray is enabled).
   *
   * Import AWS SDK `*Command` classes as needed and call `tools.client.send(...)`.
   */
  public readonly client: CognitoIdentityProviderClient;
  /**
   * The effective client config used to construct the base client.
   *
   * Note: this may contain functions/providers (e.g., credential providers).
   */
  public readonly clientConfig: CognitoIdentityProviderClientConfig;
  /** The logger used by this wrapper and (when applicable) by the AWS client. */
  public readonly logger: Logger;
  /** Materialized X-Ray state (mode + enabled + daemonAddress when relevant). */
  public readonly xray: XrayState;

  /**
   * Construct an `AwsCognitoTools` instance.
   *
   * @throws If `clientConfig.logger` is provided but does not implement
   * `debug`, `info`, `warn`, and `error`.
   * @throws If X-Ray capture is enabled but `aws-xray-sdk` is not installed.
   * @throws If X-Ray capture is requested but `AWS_XRAY_DAEMON_ADDRESS` is not set.
   */
  constructor({
    clientConfig = {},
    xray: xrayMode = 'auto',
  }: AwsCognitoToolsOptions = {}) {
    const logger = assertLogger(clientConfig.logger ?? console);

    const effectiveClientConfig: CognitoIdentityProviderClientConfig = {
      ...clientConfig,
      logger,
    };

    const base = new CognitoIdentityProviderClient(effectiveClientConfig);
    const daemonAddress = process.env.AWS_XRAY_DAEMON_ADDRESS;
    const enabled = shouldEnableXray(xrayMode, daemonAddress);
    const xrayState: XrayState = {
      mode: xrayMode,
      enabled,
      ...(enabled && daemonAddress ? { daemonAddress } : {}),
    };

    const effectiveClient = enabled
      ? captureAwsSdkV3Client(base, {
          mode: xrayMode,
          logger,
          daemonAddress,
        })
      : base;

    this.client = effectiveClient;
    this.clientConfig = effectiveClientConfig;
    this.logger = logger;
    this.xray = xrayState;
  }

  /**
   * Resolve a Cognito User Pool by explicit ID or name convention.
   *
   * Resolution order:
   * 1. If `poolId` is provided, describe it directly.
   * 2. Otherwise, list all pools and find one matching `*-{env}`.
   *
   * @throws If the pool is not found or `env` is not provided when needed.
   */
  async resolveUserPool(
    opts: ResolveUserPoolOptions = {},
  ): Promise<NonNullable<DescribeUserPoolResponse['UserPool']>> {
    const { poolId, env } = opts;

    const envPoolId = process.env.COGNITO_USER_POOL_ID;
    const effectivePoolId = poolId ?? envPoolId;

    if (effectivePoolId) {
      this.logger.debug(`Describing User Pool ${effectivePoolId}...`);
      try {
        const res = await this.client.send(
          new DescribeUserPoolCommand({ UserPoolId: effectivePoolId }),
        );
        if (!res.UserPool) {
          throw new Error(`User Pool ${effectivePoolId} not found.`);
        }
        return res.UserPool;
      } catch (err) {
        if (isResourceNotFoundException(err)) {
          throw new Error(`User Pool ${effectivePoolId} not found.`);
        }
        throw err;
      }
    }

    if (!env) {
      throw new Error(
        'Either poolId/env var or env is required for pool resolution.',
      );
    }

    this.logger.debug(`Discovering User Pool for env '${env}'...`);

    let maxResultsStr = process.env.COGNITO_LIST_USER_POOLS_MAX_RESULTS;
    if (
      maxResultsStr &&
      (Number(maxResultsStr) > 60 || Number(maxResultsStr) < 1)
    ) {
      this.logger.warn(
        `COGNITO_LIST_USER_POOLS_MAX_RESULTS must be less than or equal to 60 and greater than or equal 1. Setting it to 60.`,
      );
      maxResultsStr = '60';
    }
    const maxResults =
      maxResultsStr && !Number.isNaN(Number(maxResultsStr))
        ? Number(maxResultsStr)
        : 60;

    // We can confidently assert the properties we care about matching DescribeUserPoolResponse['UserPool']
    let match: NonNullable<DescribeUserPoolResponse['UserPool']> | undefined;
    let nextToken: string | undefined;

    do {
      const poolsRes = await this.client.send(
        new ListUserPoolsCommand({
          MaxResults: maxResults,
          ...(nextToken ? { NextToken: nextToken } : {}),
        }),
      );

      match = (poolsRes.UserPools ?? []).find((pool) =>
        pool.Name?.endsWith(`-${env}`),
      );

      if (match) break;

      nextToken = poolsRes.NextToken;
    } while (nextToken);

    if (!match?.Id) {
      throw new Error(`No User Pool found matching convention '*-${env}'.`);
    }

    this.logger.debug(`Found pool '${String(match.Name)}' (${match.Id}).`);

    try {
      const descRes = await this.client.send(
        new DescribeUserPoolCommand({ UserPoolId: match.Id }),
      );

      if (!descRes.UserPool) {
        throw new Error(`Failed to describe User Pool ${match.Id}.`);
      }

      return descRes.UserPool;
    } catch (err) {
      if (isResourceNotFoundException(err)) {
        throw new Error(`User Pool ${match.Id} not found.`);
      }
      throw err;
    }
  }

  /**
   * List all users in a User Pool with auto-pagination and guardrails.
   *
   * @param opts - Options including guardrails: `maxResults`, `maxPages`,
   *   `onPage` callback. Manual pagination is available via
   *   `tools.client.send(new ListUsersCommand({...}))`.
   *
   * @throws If `userPoolId` is not provided.
   */
  async listAllUsers(opts: ListAllUsersOptions): Promise<UserType[]> {
    const { userPoolId, maxResults, maxPages, filter, onPage } = opts;
    if (!userPoolId) throw new Error('userPoolId is required.');

    const allUsers: UserType[] = [];
    let paginationToken: string | undefined;
    let pageNumber = 0;

    do {
      pageNumber++;

      if (maxPages && pageNumber > maxPages) {
        this.logger.debug(
          `Reached maxPages limit (${String(maxPages)}). Stopping pagination.`,
        );
        break;
      }

      const res = await this.client.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          ...(paginationToken ? { PaginationToken: paginationToken } : {}),
          ...(filter ? { Filter: filter } : {}),
        }),
      );

      const pageUsers = res.Users ?? [];
      onPage?.(pageUsers, pageNumber);

      for (const user of pageUsers) {
        allUsers.push(user);
        if (maxResults && allUsers.length >= maxResults) {
          this.logger.debug(
            `Reached maxResults limit (${String(maxResults)}). Stopping pagination.`,
          );
          return allUsers;
        }
      }

      paginationToken = res.PaginationToken;
    } while (paginationToken);

    return allUsers;
  }

  /**
   * Purge all users from a User Pool.
   *
   * Resolves the pool (via `resolveUserPool`), logs the estimated count,
   * then deletes users one at a time (Cognito has no batch delete API).
   *
   * @throws If the pool cannot be resolved.
   */
  async purgeAllUsers(opts: PurgeAllUsersOptions = {}): Promise<number> {
    const { userPoolId, env } = opts;

    const pool = await this.resolveUserPool({
      poolId: userPoolId,
      env,
    });

    const poolId = pool.Id!;
    const estimated = pool.EstimatedNumberOfUsers ?? 0;
    this.logger.info(
      `Purging User Pool '${String(pool.Name)}' (${poolId}). Estimated users: ${String(estimated)}.`,
    );

    let purged = 0;

    // Fresh-list batching: each iteration fetches from the top of the pool
    // (no PaginationToken). This is safe because deleting users shifts the
    // index — reusing a pagination token after deletions may skip users.
    for (;;) {
      const res = await this.client.send(
        new ListUsersCommand({ UserPoolId: poolId }),
      );
      const users = res.Users ?? [];

      if (users.length === 0) break;

      for (const user of users) {
        if (!user.Username) continue;
        try {
          await this.client.send(
            new AdminDeleteUserCommand({
              UserPoolId: poolId,
              Username: user.Username,
            }),
          );
          purged++;
          this.logger.info(
            `  Deleted user '${user.Username}' [${String(purged)}].`,
          );
        } catch (err) {
          if (isUserNotFoundException(err)) {
            this.logger.debug(
              `  User '${user.Username}' already deleted. Skipping.`,
            );
          } else {
            throw err;
          }
        }
      }
    }

    this.logger.info(`Purge complete. ${String(purged)} user(s) deleted.`);
    return purged;
  }
}
