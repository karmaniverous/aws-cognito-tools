/**
 * Standalone CLI for aws-cognito-tools.
 *
 * Embeds get-dotenv host with cognitoPlugin pre-mounted under awsPlugin.
 * Mirrors the pattern from aws-secrets-manager-tools.
 */

import { createCli } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { cognitoPlugin } from '../../cognitoPlugin/cognitoPlugin';

await createCli({
  alias: 'aws-cognito-tools',
  compose: (program) =>
    program
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(cognitoPlugin()))
      .use(initPlugin()),
})();
