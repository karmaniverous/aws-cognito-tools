import { describe, expect, it } from 'vitest';

import { resolveMapping } from './resolveMapping';

describe('resolveMapping', () => {
  const source = {
    userPool: {
      Id: 'us-east-1_abc123',
      Name: 'my-pool-dev',
      Domain: 'my-pool-dev',
      Arn: 'arn:aws:cognito-idp:us-east-1:123456789:userpool/us-east-1_abc123',
    },
    userPoolClient: {
      ClientId: 'client-id-123',
      ClientSecret: 'secret-456',
      ClientName: 'my-client',
    },
    region: 'us-east-1',
  };

  it('resolves a top-level string path', () => {
    expect(resolveMapping(source, '$.region', 'MY_VAR')).toBe('us-east-1');
  });

  it('resolves a nested string path', () => {
    expect(resolveMapping(source, '$.userPool.Id', 'POOL_ID')).toBe(
      'us-east-1_abc123',
    );
  });

  it('resolves deeply nested path', () => {
    expect(
      resolveMapping(source, '$.userPoolClient.ClientSecret', 'SECRET'),
    ).toBe('secret-456');
  });

  it('coerces number to string', () => {
    const src = { data: { count: 42 } };
    expect(resolveMapping(src, '$.data.count', 'COUNT')).toBe('42');
  });

  it('coerces boolean to string', () => {
    const src = { data: { enabled: true } };
    expect(resolveMapping(src, '$.data.enabled', 'FLAG')).toBe('true');
  });

  it('JSON-stringifies objects', () => {
    const src = { data: { nested: { a: 1 } } };
    expect(resolveMapping(src, '$.data.nested', 'OBJ')).toBe('{"a":1}');
  });

  it('throws on undefined path', () => {
    expect(() =>
      resolveMapping(source, '$.userPool.NonExistent', 'MY_VAR'),
    ).toThrow("path '$.userPool.NonExistent' resolved to undefined");
  });

  it('throws with env var name in message', () => {
    expect(() =>
      resolveMapping(source, '$.missing.deep', 'IMPORTANT_VAR'),
    ).toThrow("Mapping 'IMPORTANT_VAR'");
  });

  it('throws when hitting non-object mid-path', () => {
    expect(() =>
      resolveMapping(source, '$.region.something', 'BAD_PATH'),
    ).toThrow('hit non-object');
  });

  it('handles path without $. prefix', () => {
    expect(resolveMapping(source, 'region', 'MY_VAR')).toBe('us-east-1');
  });
});
