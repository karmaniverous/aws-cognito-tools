/**
 * This is the main entry point for the library.
 *
 * @packageDocumentation
 */

/**
 * Requirements addressed:
 * - Export a public `AwsCognitoTools`.
 * - Keep `resolveMapping` and `CognitoMappings` available without loading
 *   the optional get-dotenv peer.
 * - Export local public `Logger`.
 */

export type { CognitoMappings } from './cognitoMappings';
export { resolveMapping } from './cognitoPlugin/resolveMapping';
export {
  AwsCognitoTools,
  type AwsCognitoToolsOptions,
  type ListAllUsersOptions,
  type PurgeAllUsersOptions,
  type ResolveUserPoolOptions,
} from './cognitoTools/AwsCognitoTools';
export { assertLogger, type Logger } from './logger';
