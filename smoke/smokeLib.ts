/**
 * Smoke test for aws-cognito-tools against a real Cognito User Pool.
 *
 * Prerequisites:
 * - AWS credentials configured
 * - Environment variables:
 *   - COGNITO_USER_POOL_ID or a pool matching *-\{env\} naming convention
 *   - AWS_DEFAULT_REGION
 *
 * Usage:
 *   npx tsx smoke/smokeLib.ts
 */

import { AwsCognitoTools } from '../src/cognitoTools/AwsCognitoTools';

const env = process.env.ENV ?? 'dev';

const tools = new AwsCognitoTools({
  clientConfig: {
    region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    logger: console,
  },
  xray: 'off',
});

console.log('\n=== Smoke Test: aws-cognito-tools ===\n');

// 1. Resolve User Pool
console.log(`1. Resolving User Pool for env '${env}'...`);
const pool = await tools.resolveUserPool({ env });
console.log(`   ✅ Found: '${String(pool.Name)}' (${String(pool.Id)})`);
console.log(`   Estimated users: ${String(pool.EstimatedNumberOfUsers ?? 0)}`);

// 2. List Users (first page)
console.log(`\n2. Listing users (first page)...`);
const users = await tools.listAllUsers({
  userPoolId: pool.Id!,
  maxPages: 1,
});
console.log(`   ✅ Found ${String(users.length)} user(s) on first page.`);

// 3. Escape hatch — describe pool directly via client.send()
console.log(`\n3. Escape hatch: DescribeUserPool via client.send()...`);
const { DescribeUserPoolCommand } =
  await import('@aws-sdk/client-cognito-identity-provider');
const desc = await tools.client.send(
  new DescribeUserPoolCommand({ UserPoolId: pool.Id }),
);
console.log(`   ✅ Pool ARN: ${String(desc.UserPool?.Arn?.slice(0, 60))}...`);

console.log('\n=== All smoke tests passed ===\n');
