/**
 * Smoke test for `aws cognito pull` with real AWS credentials.
 *
 * Creates a temp directory with a .env template, runs pull with
 * hardcoded mappings, and verifies values were written.
 *
 * Prerequisites:
 * - AWS_PROFILE and AWS_REGION set for the VC account
 * - Pool ID and client name passed as env vars or args
 *
 * Usage:
 *   AWS_PROFILE=vc-dev AWS_REGION=us-east-1
 *     SMOKE_POOL_ID=us-east-1_5D4cvSC9d
 *     SMOKE_CLIENT_NAME=web-app
 *     npx tsx smoke/smokePull.ts
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DescribeUserPoolClientCommand,
  type DescribeUserPoolClientCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';

import { resolveMapping } from '../src/cognitoPlugin/resolveMapping';
import { AwsCognitoTools } from '../src/cognitoTools/AwsCognitoTools';

const poolId = process.env.SMOKE_POOL_ID;
const clientName = process.env.SMOKE_CLIENT_NAME;

if (!poolId || !clientName) {
  console.error(
    'Set SMOKE_POOL_ID and SMOKE_CLIENT_NAME env vars.\n' +
      'Example:\n' +
      '  AWS_PROFILE=vc-dev AWS_REGION=us-east-1 \\\n' +
      '    SMOKE_POOL_ID=us-east-1_5D4cvSC9d \\\n' +
      '    SMOKE_CLIENT_NAME=web-app \\\n' +
      '    npx tsx smoke/smokePull.ts',
  );
  process.exit(1);
}

console.log('\n=== Smoke Test: Pull Flow ===\n');

const tools = new AwsCognitoTools({
  clientConfig: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    logger: console,
  },
  xray: 'off',
});

// 1. Resolve pool
console.log('1. Resolving pool...');
const userPool = await tools.resolveUserPool({ poolId });
console.log(`   ✅ Pool: ${String(userPool.Name)} (${String(userPool.Id)})`);

// 2. Find and describe client
console.log(`\n2. Describing client '${clientName}'...`);
const clientDesc: DescribeUserPoolClientCommandOutput = await tools.client.send(
  new DescribeUserPoolClientCommand({
    UserPoolId: poolId,
    ClientId: await findClientId(tools, poolId, clientName),
  }),
);
const userPoolClient = clientDesc.UserPoolClient!;
console.log(
  `   ✅ Client: ${String(userPoolClient.ClientName)} (${String(userPoolClient.ClientId)})`,
);

// 3. Build source object and test resolveMapping
console.log('\n3. Testing JSONPath resolution...');
const source: Record<string, unknown> = {
  userPool,
  userPoolClient,
  region: process.env.AWS_REGION ?? 'us-east-1',
};

const testMappings: Record<string, string> = {
  COGNITO_USER_POOL_ID: '$.userPool.Id',
  COGNITO_CLIENT_ID: '$.userPoolClient.ClientId',
  COGNITO_REGION: '$.region',
};

const resolved: Record<string, string> = {};
for (const [envVar, jsonPath] of Object.entries(testMappings)) {
  resolved[envVar] = resolveMapping(source, jsonPath, envVar);
  console.log(`   ${envVar} = ${resolved[envVar]}`);
}
console.log('   ✅ All mappings resolved successfully.');

// 4. Write to a temp .env file to verify file I/O
console.log('\n4. Testing file write...');
const tmpDir = join(import.meta.dirname, '.tmp-smoke');
mkdirSync(tmpDir, { recursive: true });

const envContent = Object.entries(resolved)
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');
const envPath = join(tmpDir, '.env.smoke');
writeFileSync(envPath, envContent + '\n');

const written = readFileSync(envPath, 'utf8');
console.log(`   Written to: ${envPath}`);
console.log(
  `   Content:\n${written
    .split('\n')
    .map((l) => `     ${l}`)
    .join('\n')}`,
);

// Verify
for (const [k, v] of Object.entries(resolved)) {
  if (!written.includes(`${k}=${v}`)) {
    throw new Error(`Missing ${k}=${v} in written file!`);
  }
}
console.log('   ✅ File write verified.');

// Cleanup
rmSync(tmpDir, { recursive: true });
console.log('\n=== All smoke tests passed ===\n');

// Helper
async function findClientId(
  t: AwsCognitoTools,
  pId: string,
  cName: string,
): Promise<string> {
  const { ListUserPoolClientsCommand } =
    await import('@aws-sdk/client-cognito-identity-provider');
  const res = await t.client.send(
    new ListUserPoolClientsCommand({ UserPoolId: pId, MaxResults: 60 }),
  );
  const match = (res.UserPoolClients ?? []).find((c) => c.ClientName === cName);
  if (!match?.ClientId)
    throw new Error(`Client '${cName}' not found in pool ${pId}.`);
  return match.ClientId;
}
