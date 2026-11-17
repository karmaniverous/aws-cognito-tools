import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8');
const pkg = JSON.parse(read('package.json')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  exports?: Record<string, unknown>;
  'release-it'?: { github?: { releaseName?: string } };
};

describe('package contract', () => {
  it('declares get-dotenv as an optional peer and dev dependency only', () => {
    expect(pkg.dependencies).not.toHaveProperty('@karmaniverous/get-dotenv');
    expect(pkg.devDependencies).toHaveProperty(
      '@karmaniverous/get-dotenv',
      '^8.0.0-0',
    );
    expect(pkg.peerDependencies).toHaveProperty(
      '@karmaniverous/get-dotenv',
      '^8.0.0-0',
    );
    expect(pkg.peerDependenciesMeta).toMatchObject({
      '@karmaniverous/get-dotenv': { optional: true },
    });
  });
  it('exports the isolated get-dotenv entry and declares zod', () => {
    expect(pkg.dependencies).toHaveProperty('zod');
    expect(pkg.exports).toHaveProperty('./get-dotenv');
  });
  it('keeps CognitoMappings outside the zod module and at the root', () => {
    expect(read('src/cognitoPlugin/cognitoPluginConfig.ts')).not.toContain(
      'export type CognitoMappings',
    );
    expect(read('src/index.ts')).toContain(
      "export type { CognitoMappings } from './cognitoMappings';",
    );
  });
  it('names GitHub releases after the package', () => {
    expect(pkg['release-it']?.github?.releaseName).toBe(
      "${name.split('/').pop()}@${version}",
    );
  });
});
