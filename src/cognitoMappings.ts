/**
 * Cognito pull mapping contracts kept outside the zod-backed plugin module so
 * the package root remains independent of the optional get-dotenv peer.
 *
 * @packageDocumentation
 */

/**
 * The shape of `pull.mappings` in Cognito plugin config.
 *
 * Structure: `scope → privacy → envVarName → jsonPath`.
 */
export type CognitoMappings = Record<
  string,
  Record<string, Record<string, string>>
>;
