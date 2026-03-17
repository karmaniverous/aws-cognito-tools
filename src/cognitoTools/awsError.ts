/**
 * Cognito-specific AWS error classification.
 *
 * Follows the pattern from aws-secrets-manager-tools `awsError.ts`.
 */

interface AwsError {
  name?: string;
  __type?: string;
}

const isAwsError = (err: unknown): err is AwsError =>
  typeof err === 'object' && err !== null;

/**
 * Check if an error is a Cognito `UserNotFoundException`.
 *
 * Used by `purgeAllUsers` to handle race conditions where a user is deleted
 * between listing and deletion.
 */
export const isUserNotFoundException = (err: unknown): boolean => {
  if (!isAwsError(err)) return false;
  return (
    err.name === 'UserNotFoundException' ||
    err.__type === 'UserNotFoundException'
  );
};

/**
 * Check if an error is a `ResourceNotFoundException`.
 *
 * Used for pool/client not-found scenarios.
 */
export const isResourceNotFoundException = (err: unknown): boolean => {
  if (!isAwsError(err)) return false;
  return (
    err.name === 'ResourceNotFoundException' ||
    err.__type === 'ResourceNotFoundException'
  );
};
