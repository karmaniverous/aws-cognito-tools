/** Build the get-dotenv host options for the standalone Cognito CLI. */

import type { CreateCliOptions } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { cognitoPlugin } from '../../cognitoPlugin/cognitoPlugin';

/** Create CLI options with this package's host identity. */
export const createAwsCognitoCliOptions = (
  importMetaUrl: string,
): CreateCliOptions => ({
  alias: 'aws-cognito-tools',
  importMetaUrl,
  compose: (program) =>
    program
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(cognitoPlugin()))
      .use(initPlugin()),
});
