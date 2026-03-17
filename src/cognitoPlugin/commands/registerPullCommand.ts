/**
 * Requirements addressed:
 * - Provide `aws cognito pull`.
 * - Resolve pool + find client by --client-name + describe both.
 * - Walk CognitoMappings via JSONPath resolver.
 * - Write to dotenv files via editDotenvFile with get-dotenv precedence.
 * - Use createPluginDynamicOption for all CLI options.
 * - --include/--exclude are mutually exclusive.
 * - --template-extension resolution: CLI flag → plugin config → get-dotenv root → 'template'.
 * - Region sourced from getAwsRegion(ctx), not plugin config.
 */

import {
  DescribeUserPoolClientCommand,
  type DescribeUserPoolClientCommandOutput,
  ListUserPoolClientsCommand,
  type ListUserPoolClientsCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  applyIncludeExclude,
  buildSpawnEnv,
  dotenvExpand,
  editDotenvFile,
  getDotenvCliOptions2Options,
  requireString,
} from '@karmaniverous/get-dotenv';
import {
  describeConfigKeyListDefaults,
  readMergedOptions,
} from '@karmaniverous/get-dotenv/cliHost';

import {
  type CognitoMappings,
  resolveIncludeExclude,
} from '../cognitoPluginConfig';
import { resolveMapping } from '../resolveMapping';
import { resolveUserPoolForCommand } from '../resolveUserPool';
import type { CognitoPluginApi, CognitoPluginCli } from './types';

export const registerPullCommand = ({
  cli,
  plugin,
}: {
  cli: CognitoPluginCli;
  plugin: CognitoPluginApi;
}): void => {
  const pull = cli
    .ns('pull')
    .description(
      'Pull Cognito User Pool + Client config into local dotenv files.',
    );

  pull
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '-p, --pool-id <string>',
        (_helpCfg, pluginCfg) =>
          `User Pool ID (supports $VAR expansion) (default: ${pluginCfg.userPoolId ?? '$COGNITO_USER_POOL_ID'})`,
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '-c, --client-name <string>',
        (_helpCfg, pluginCfg) =>
          `User Pool Client name (supports $VAR expansion) (default: ${pluginCfg.clientName ?? '$COGNITO_USER_POOL_CLIENT_NAME'})`,
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '-t, --template-extension <string>',
        (_helpCfg, pluginCfg) => {
          const def = pluginCfg.templateExtension ?? 'template';
          return `dotenv template extension used when target file is missing (default: ${def})`;
        },
      ),
    )
    .addOption(
      plugin
        .createPluginDynamicOption(
          pull,
          '-e, --exclude <strings...>',
          (_helpCfg, pluginCfg) => {
            const { excludeDefault } = describeConfigKeyListDefaults({
              cfgInclude: pluginCfg.pull?.include,
              cfgExclude: pluginCfg.pull?.exclude,
            });
            return `keys to exclude from pulled mappings (default: ${excludeDefault})`;
          },
        )
        .conflicts('include'),
    )
    .addOption(
      plugin
        .createPluginDynamicOption(
          pull,
          '-i, --include <strings...>',
          (_helpCfg, pluginCfg) => {
            const { includeDefault } = describeConfigKeyListDefaults({
              cfgInclude: pluginCfg.pull?.include,
              cfgExclude: pluginCfg.pull?.exclude,
            });
            return `keys to include from pulled mappings (default: ${includeDefault})`;
          },
        )
        .conflicts('exclude'),
    )
    .action(async (opts, command) => {
      const logger = console;
      const ctx = cli.getCtx();
      const bag = readMergedOptions(command);
      const rootOpts = getDotenvCliOptions2Options(bag);
      const cfg = plugin.readConfig(pull);

      const paths = rootOpts.paths ?? ['./'];
      const dotenvToken = rootOpts.dotenvToken ?? '.env';
      const privateToken = rootOpts.privateToken ?? 'local';

      const envRef = buildSpawnEnv(process.env, ctx.dotenv);

      // Resolve client name
      const clientNameRaw =
        opts.clientName ?? cfg.clientName ?? '$COGNITO_USER_POOL_CLIENT_NAME';
      const clientName = dotenvExpand(clientNameRaw, envRef);
      if (!clientName) throw new Error('client-name is required.');

      const env = bag.env ?? bag.defaultEnv;

      // 1. Resolve the User Pool
      logger.info('Resolving User Pool...');
      const {
        tools,
        region,
        userPool,
        userPoolId: resolvedPoolId,
        userPoolName,
      } = await resolveUserPoolForCommand({
        ctx,
        cfg,
        poolIdOpt: opts.poolId,
        env,
        debug: bag.debug,
      });

      logger.info(`Found pool '${String(userPoolName)}' (${resolvedPoolId}).`);

      // 2. Find the User Pool Client by name
      logger.info(`Looking for client '${clientName}'...`);
      const clientsRes: ListUserPoolClientsCommandOutput =
        await tools.client.send(
          new ListUserPoolClientsCommand({
            UserPoolId: resolvedPoolId,
            MaxResults: 60,
          }),
        );
      const clientMatch = (clientsRes.UserPoolClients ?? []).find(
        (c) => c.ClientName === clientName,
      );
      if (!clientMatch?.ClientId) {
        throw new Error(
          `No User Pool Client found with name '${clientName}' in pool ${resolvedPoolId}.`,
        );
      }

      // 3. Describe the client to get full details (including ClientSecret)
      const clientDesc: DescribeUserPoolClientCommandOutput =
        await tools.client.send(
          new DescribeUserPoolClientCommand({
            UserPoolId: resolvedPoolId,
            ClientId: clientMatch.ClientId,
          }),
        );
      const userPoolClient = clientDesc.UserPoolClient;
      if (!userPoolClient) {
        throw new Error(
          `Failed to describe client '${clientName}' (${clientMatch.ClientId}).`,
        );
      }
      logger.info(
        `Found client '${String(userPoolClient.ClientName)}' (${String(userPoolClient.ClientId)}).`,
      );

      // 4. Build the source object for JSONPath resolution
      const source: Record<string, unknown> = {
        userPool,
        userPoolClient,
        region: region ?? '',
      };

      // 5. Walk mappings and resolve
      const mappings: CognitoMappings = cfg.pull?.mappings ?? {};
      const templateExtension =
        opts.templateExtension ?? cfg.templateExtension ?? 'template';

      const { include, exclude } = resolveIncludeExclude({
        cliInclude: opts.include,
        cliExclude: opts.exclude,
        cfgInclude: cfg.pull?.include,
        cfgExclude: cfg.pull?.exclude,
      });

      for (const [scope, privacyMap] of Object.entries(mappings)) {
        for (const [privacy, envVarMap] of Object.entries(privacyMap)) {
          // Resolve all mappings to key-value pairs
          const resolved: Record<string, string> = {};
          for (const [envVarName, jsonPath] of Object.entries(envVarMap)) {
            resolved[envVarName] = resolveMapping(source, jsonPath, envVarName);
          }

          // Apply include/exclude filtering
          const filtered = applyIncludeExclude(resolved, { include, exclude });

          if (Object.keys(filtered).length === 0) continue;

          const editCommon = {
            paths,
            dotenvToken,
            privateToken,
            privacy: privacy as 'public' | 'private',
            templateExtension,
          };

          const res =
            scope === 'env'
              ? await editDotenvFile(filtered, {
                  ...editCommon,
                  scope: 'env',
                  env: requireString(
                    env,
                    'env is required (use --env or defaultEnv).',
                  ),
                })
              : await editDotenvFile(filtered, {
                  ...editCommon,
                  scope: 'global',
                });

          logger.info(
            `Wrote ${String(Object.keys(filtered).length)} key(s) to ${res.path}`,
          );
        }
      }

      logger.info('Pull complete.');
    });
};
