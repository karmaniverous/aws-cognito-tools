/** get-dotenv-backed CLI runner loaded dynamically by the bin launcher. */

import { createCli } from '@karmaniverous/get-dotenv/cli';

import { createAwsCognitoCliOptions } from './cliOptions';

/** Run the standalone AWS Cognito CLI. */
export const run = async (): Promise<void> => {
  await createCli(createAwsCognitoCliOptions(import.meta.url))();
};
