/**
 * Cognito-specific AWS error classification.
 *
 * Follows the pattern from aws-secrets-manager-tools `awsError.ts`.
 * Uses a factory to DRY the repeated name/__type matching pattern.
 */

interface AwsError {
  name?: string;
  __type?: string;
}

const isAwsError = (err: unknown): err is AwsError =>
  typeof err === 'object' && err !== null;

/**
 * Factory for AWS error type guards.
 *
 * Matches against both `err.name` and `err.__type` to handle
 * variations across AWS SDK error shapes.
 */
const isAwsErrorOfType =
  (type: string) =>
  (err: unknown): boolean => {
    if (!isAwsError(err)) return false;
    return err.name === type || err.__type === type;
  };

/**
 * Check if an error is a Cognito `UserNotFoundException`.
 *
 * Used by `purgeAllUsers` to handle race conditions where a user is deleted
 * between listing and deletion.
 */
export const isUserNotFoundException = isAwsErrorOfType(
  'UserNotFoundException',
);

/**
 * Check if an error is a `ResourceNotFoundException`.
 *
 * Used for pool/client not-found scenarios.
 */
export const isResourceNotFoundException = isAwsErrorOfType(
  'ResourceNotFoundException',
);
