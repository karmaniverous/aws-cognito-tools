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

export {
  AwsCognitoTools,
  type AwsCognitoToolsOptions,
  type ListAllUsersOptions,
  type PurgeAllUsersOptions,
  type ResolveUserPoolOptions,
} from './cognitoTools/AwsCognitoTools';

// Layer 2 — Plugin (placeholder, uncomment in Layer 2 checkpoint)
// export { cognitoPlugin } from './cognitoPlugin/cognitoPlugin';
