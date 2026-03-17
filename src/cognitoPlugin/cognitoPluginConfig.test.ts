import { describe, expect, it } from 'vitest';

import { resolveIncludeExclude } from './cognitoPluginConfig';

describe('resolveIncludeExclude', () => {
  it('returns CLI include when provided', () => {
    const result = resolveIncludeExclude({
      cliInclude: ['KEY1'],
      cfgInclude: ['KEY2'],
    });
    expect(result.include).toEqual(['KEY1']);
    expect(result.exclude).toBeUndefined();
  });

  it('returns CLI exclude when provided', () => {
    const result = resolveIncludeExclude({
      cliExclude: ['KEY1'],
      cfgExclude: ['KEY2'],
    });
    expect(result.exclude).toEqual(['KEY1']);
    expect(result.include).toBeUndefined();
  });

  it('falls back to config include when no CLI flags', () => {
    const result = resolveIncludeExclude({
      cfgInclude: ['KEY1'],
    });
    expect(result.include).toEqual(['KEY1']);
  });

  it('falls back to config exclude when no CLI flags', () => {
    const result = resolveIncludeExclude({
      cfgExclude: ['KEY1'],
    });
    expect(result.exclude).toEqual(['KEY1']);
  });

  it('CLI include suppresses config exclude', () => {
    const result = resolveIncludeExclude({
      cliInclude: ['KEY1'],
      cfgExclude: ['KEY2'],
    });
    expect(result.include).toEqual(['KEY1']);
    expect(result.exclude).toBeUndefined();
  });

  it('CLI exclude suppresses config include', () => {
    const result = resolveIncludeExclude({
      cliExclude: ['KEY1'],
      cfgInclude: ['KEY2'],
    });
    expect(result.exclude).toEqual(['KEY1']);
    expect(result.include).toBeUndefined();
  });

  it('throws when both include and exclude are set', () => {
    expect(() =>
      resolveIncludeExclude({
        cfgInclude: ['KEY1'],
        cfgExclude: ['KEY2'],
      }),
    ).toThrow('mutually exclusive');
  });

  it('returns empty when nothing set', () => {
    const result = resolveIncludeExclude({});
    expect(result.include).toBeUndefined();
    expect(result.exclude).toBeUndefined();
  });
});
