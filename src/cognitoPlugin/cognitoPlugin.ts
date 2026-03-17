/**
 * Requirements addressed:
 * - Provide get-dotenv plugin mounted as `aws cognito` with commands:
 *   - `aws cognito pull`
 *   - `aws cognito purge`
 * - Keep the plugin adapter thin: command registration is decomposed into
 *   dedicated modules; core behavior lives outside this file.
 */

import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

import { cognitoPluginConfigSchema } from './cognitoPluginConfig';
import { registerPullCommand } from './commands/registerPullCommand';
import { registerPurgeCommand } from './commands/registerPurgeCommand';

/**
 * get-dotenv plugin that provides `aws cognito pull|purge`.
 *
 * Intended usage: mount under `awsPlugin().use(cognitoPlugin())`.
 */
export const cognitoPlugin = () => {
  const plugin = definePlugin({
    ns: 'cognito',
    configSchema: cognitoPluginConfigSchema,
    setup(cli) {
      cli.description('AWS Cognito User Pool helpers.');
      registerPullCommand({ cli, plugin });
      registerPurgeCommand({ cli, plugin });
    },
  });

  return plugin;
};
