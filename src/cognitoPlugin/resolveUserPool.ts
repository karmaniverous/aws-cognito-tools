/**
 * Shared helper for Layer 2 commands: resolve a User Pool using plugin config,
 * CLI options, and get-dotenv context.
 *
 * Requirements addressed:
 * - Encapsulate pool resolution used by both `pull` and `purge`.
 * - Supports `$VAR` expansion against `{ ...process.env, ...ctx.dotenv }`.
 * - Region is sourced from `getAwsRegion(ctx)`.
 */

import {
  buildSpawnEnv,
  dotenvExpand,
  silentLogger,
} from '@karmaniverous/get-dotenv';
import { getAwsRegion } from '@karmaniverous/get-dotenv/plugins/aws';

import { AwsCognitoTools } from '../cognitoTools/AwsCognitoTools';
import type { CognitoPluginConfig } from './cognitoPluginConfig';

export const resolveUserPoolForCommand = async ({
  ctx,
  cfg,
  poolIdOpt,
  env,
  debug,
}: {
  ctx: { dotenv: Record<string, string | undefined> };
  cfg: CognitoPluginConfig;
  poolIdOpt?: string;
  env?: string;
  debug?: boolean;
}): Promise<{
  tools: AwsCognitoTools;
  region?: string;
  userPool: Awaited<ReturnType<AwsCognitoTools['resolveUserPool']>>;
  userPoolId: string;
  userPoolName?: string;
}> => {
  const sdkLogger = debug ? console : silentLogger;

  const envRef = buildSpawnEnv(process.env, ctx.dotenv);
  const poolIdRaw = poolIdOpt ?? cfg.userPoolId ?? '$COGNITO_USER_POOL_ID';
  const poolId = dotenvExpand(poolIdRaw, envRef) || undefined;

  const region = getAwsRegion(ctx as never);
  const tools = new AwsCognitoTools({
    clientConfig: region
      ? { region, logger: sdkLogger }
      : { logger: sdkLogger },
  });

  const userPool = await tools.resolveUserPool({ poolId, env });

  if (!userPool.Id) {
    throw new Error('Resolved User Pool is missing Id.');
  }

  return {
    tools,
    region,
    userPool,
    userPoolId: userPool.Id,
    userPoolName: userPool.Name,
  };
};
