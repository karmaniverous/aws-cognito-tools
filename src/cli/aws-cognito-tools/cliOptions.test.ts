import { describe, expect, it, vi } from 'vitest';

import { createAwsCognitoCliOptions } from './cliOptions';

describe('createAwsCognitoCliOptions', () => {
  it('passes the host importMetaUrl and composes every plugin', () => {
    const importMetaUrl = 'file:///package/dist/cli/run.js';
    const options = createAwsCognitoCliOptions(importMetaUrl);
    expect(options.alias).toBe('aws-cognito-tools');
    expect(options.importMetaUrl).toBe(importMetaUrl);
    const program = { use: vi.fn() };
    program.use.mockReturnValue(program);
    expect(options.compose?.(program as never)).toBe(program);
    expect(program.use).toHaveBeenCalledTimes(4);
  });
});
