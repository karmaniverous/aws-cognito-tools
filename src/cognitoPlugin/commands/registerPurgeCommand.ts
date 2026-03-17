/**
 * Requirements addressed:
 * - Provide `aws cognito purge`.
 * - Require `--force` for destructive purge; otherwise reject.
 * - Use plugin dynamic options for config-composed defaults in help.
 * - Delegate to AwsCognitoTools.purgeAllUsers.
 */

import { readMergedOptions } from '@karmaniverous/get-dotenv/cliHost';

import { resolveUserPoolForCommand } from '../resolveUserPool';
import type { CognitoPluginApi, CognitoPluginCli } from './types';

export const registerPurgeCommand = ({
  cli,
  plugin,
}: {
  cli: CognitoPluginCli;
  plugin: CognitoPluginApi;
}): void => {
  const purge = cli
    .ns('purge')
    .description('Delete all users from a Cognito User Pool (DESTRUCTIVE).');

  purge
    .addOption(
      plugin.createPluginDynamicOption(
        purge,
        '-p, --pool-id <string>',
        (_helpCfg, pluginCfg) =>
          `User Pool ID (supports $VAR expansion) (default: ${pluginCfg.userPoolId ?? '$COGNITO_USER_POOL_ID'})`,
      ),
    )
    .option('--force', 'skip confirmation and purge immediately', false)
    .action(async (opts) => {
      const logger = console;
      const ctx = cli.getCtx();
      const bag = readMergedOptions(purge);
      const cfg = plugin.readConfig(purge);

      if (!opts.force) {
        throw new Error(
          'Purge is destructive. Use --force to confirm deletion of all users.',
        );
      }

      const env = bag.env ?? bag.defaultEnv;

      const { tools, userPoolId, userPoolName } =
        await resolveUserPoolForCommand({
          ctx,
          cfg,
          poolIdOpt: opts.poolId,
          env,
          debug: bag.debug,
        });

      logger.info(`Purging pool '${String(userPoolName)}' (${userPoolId})...`);

      const count = await tools.purgeAllUsers({
        userPoolId,
      });

      logger.info(`Purge complete. ${String(count)} user(s) deleted.`);
    });
};
