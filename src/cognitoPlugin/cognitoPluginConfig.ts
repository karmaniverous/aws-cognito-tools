/**
 * Requirements addressed:
 * - Support safe plugin defaults from get-dotenv config under `plugins['aws/cognito']`
 *   using a schema-typed config (no casts required at call sites).
 * - CLI flags override config defaults.
 * - include/exclude are mutually exclusive; unknown keys are ignored at filter time.
 * - CognitoMappings type for pull mapping config.
 */

import { z } from '@karmaniverous/get-dotenv/cliHost';

/**
 * Schema for `aws cognito` plugin configuration.
 *
 * Loaded from get-dotenv config under `plugins['aws/cognito']`.
 */
export const cognitoPluginConfigSchema = z.object({
  /**
   * Default User Pool ID.
   *
   * Supports `$VAR` expansion at action time against `{ ...process.env, ...ctx.dotenv }`.
   */
  userPoolId: z.string().optional(),
  /**
   * Default User Pool Client name for `aws cognito pull`.
   *
   * Supports `$VAR` expansion.
   */
  clientName: z.string().optional(),
  /**
   * Default template extension used by `aws cognito pull` when the destination
   * dotenv file is missing.
   */
  templateExtension: z.string().optional(),
  /**
   * Defaults for `aws cognito pull`.
   */
  pull: z
    .object({
      /**
       * Cognito mappings: scope → privacy → envVar → JSONPath.
       *
       * Each JSONPath is resolved against the source object:
       * `{ userPool, userPoolClient, region }`.
       */
      mappings: z
        .record(
          z.string(),
          z.record(z.string(), z.record(z.string(), z.string())),
        )
        .optional(),
      /**
       * Default include list applied to mapped keys before writing.
       *
       * Mutually exclusive with `pull.exclude`.
       */
      include: z.array(z.string()).optional(),
      /**
       * Default exclude list applied to mapped keys before writing.
       *
       * Mutually exclusive with `pull.include`.
       */
      exclude: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CognitoPluginConfig = z.output<typeof cognitoPluginConfigSchema>;

/**
 * CognitoMappings type — the shape of `pull.mappings` in plugin config.
 *
 * Structure: `scope → privacy → envVarName → jsonPath`
 *
 * Example:
 * ```
 * { env: { public: { "MY_VAR": "$.userPool.Id" } } }
 * ```
 */
export type CognitoMappings = Record<
  string,
  Record<string, Record<string, string>>
>;

/**
 * Resolve include/exclude from CLI flags and config defaults.
 *
 * CLI overrides config: if either include/exclude is provided on CLI,
 * config's include/exclude is ignored entirely.
 */
export const resolveIncludeExclude = ({
  cliInclude,
  cliExclude,
  cfgInclude,
  cfgExclude,
}: {
  cliInclude?: string[];
  cliExclude?: string[];
  cfgInclude?: string[];
  cfgExclude?: string[];
}): { include?: string[]; exclude?: string[] } => {
  const include = cliInclude ?? (cliExclude ? undefined : cfgInclude);
  const exclude = cliExclude ?? (cliInclude ? undefined : cfgExclude);

  if (include?.length && exclude?.length) {
    throw new Error('--exclude and --include are mutually exclusive.');
  }

  return { include, exclude };
};
