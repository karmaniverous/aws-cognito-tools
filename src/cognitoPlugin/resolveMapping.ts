/**
 * Requirements addressed:
 * - Resolve JSONPath-style dot notation against a source object.
 * - Coerce non-string primitives to string.
 * - Throw on undefined with clear message naming the mapping + path.
 * - Fail-fast: no silent nulls.
 */

/**
 * Resolve a dot-notation path (e.g. `$.userPool.Id`) against a source object.
 *
 * @param source - The object to resolve against.
 * @param jsonPath - Dot-notation path starting with `$` (e.g. `$.userPool.Id`).
 * @param envVarName - The env var name this mapping is for (used in error messages).
 * @returns The resolved value as a string.
 * @throws If the path resolves to `undefined` or `null`.
 */
export const resolveMapping = (
  source: Record<string, unknown>,
  jsonPath: string,
  envVarName: string,
): string => {
  // Strip leading "$." prefix
  const path = jsonPath.startsWith('$.') ? jsonPath.slice(2) : jsonPath;
  const segments = path.split('.');

  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      throw new Error(
        `Mapping '${envVarName}': path '${jsonPath}' resolved to undefined at segment '${segment}'.`,
      );
    }
    if (typeof current !== 'object') {
      throw new Error(
        `Mapping '${envVarName}': path '${jsonPath}' hit non-object at segment '${segment}'.`,
      );
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (current === null || current === undefined) {
    throw new Error(
      `Mapping '${envVarName}': path '${jsonPath}' resolved to undefined.`,
    );
  }

  if (typeof current === 'string') return current;
  if (typeof current === 'number' || typeof current === 'boolean') {
    return String(current);
  }

  // Objects/arrays: JSON-stringify for visibility
  return JSON.stringify(current);
};
