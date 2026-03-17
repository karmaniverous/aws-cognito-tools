/**
 * Requirements addressed:
 * - Use get-dotenv public types end-to-end (no casts) for command wiring.
 */

import type { GetDotenvOptions } from '@karmaniverous/get-dotenv';
import type {
  GetDotenvCliPublic,
  PluginWithInstanceHelpers,
} from '@karmaniverous/get-dotenv/cliHost';

import type { CognitoPluginConfig } from '../cognitoPluginConfig';

export type CognitoPluginCli = GetDotenvCliPublic<GetDotenvOptions>;
export type CognitoPluginApi = PluginWithInstanceHelpers<
  GetDotenvOptions,
  CognitoPluginConfig
>;
