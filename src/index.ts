/**
 * This is the main entry point for the library.
 *
 * @packageDocumentation
 */

/**
 * Requirements addressed:
 * - Export a public `AwsCognitoTools`.
 * - Export the get-dotenv `cognitoPlugin` for mounting under `aws`.
 */

export { cognitoPlugin } from './cognitoPlugin/cognitoPlugin';
export type { CognitoMappings } from './cognitoPlugin/cognitoPluginConfig';
export { resolveMapping } from './cognitoPlugin/resolveMapping';
export {
  AwsCognitoTools,
  type AwsCognitoToolsOptions,
  type ListAllUsersOptions,
  type PurgeAllUsersOptions,
  type ResolveUserPoolOptions,
} from './cognitoTools/AwsCognitoTools';
