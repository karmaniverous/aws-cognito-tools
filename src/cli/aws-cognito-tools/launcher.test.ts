import { describe, expect, it, vi } from 'vitest';

import { getDotenvInstallHint, isMissingGetDotenv, launch } from './launcher';

const names = {
  bin: 'aws-cognito-tools',
  pkg: '@karmaniverous/aws-cognito-tools',
};
const expectedHint = [
  'aws-cognito-tools needs @karmaniverous/get-dotenv ^8.0.0-0. Install it:',
  '  local:  npm i -D @karmaniverous/get-dotenv@^8.0.0-0',
  '  global: npm i -g @karmaniverous/get-dotenv@^8.0.0-0',
  '  npx:    npx -p @karmaniverous/get-dotenv@^8.0.0-0 -p @karmaniverous/aws-cognito-tools aws-cognito-tools',
].join('\n');
const missingGetDotenv = Object.assign(
  new Error(
    "Cannot find package '@karmaniverous/get-dotenv' imported from /app/run.js",
  ),
  { code: 'ERR_MODULE_NOT_FOUND' },
);

describe('launcher', () => {
  it('lists all install routes', () => {
    expect(getDotenvInstallHint(names.bin, names.pkg)).toBe(expectedHint);
  });
  it('recognizes only a missing get-dotenv package', () => {
    expect(isMissingGetDotenv(missingGetDotenv)).toBe(true);
    expect(
      isMissingGetDotenv(
        Object.assign(new Error("Cannot find package 'x'"), {
          code: 'ERR_MODULE_NOT_FOUND',
        }),
      ),
    ).toBe(false);
    expect(isMissingGetDotenv(null)).toBe(false);
  });
  it('prints the hint and exits 1 when get-dotenv is absent', async () => {
    const io = { error: vi.fn(), exit: vi.fn() };
    await launch(() => Promise.reject(missingGetDotenv), names, io);
    expect(io.error).toHaveBeenCalledExactlyOnceWith(expectedHint);
    expect(io.exit).toHaveBeenCalledExactlyOnceWith(1);
  });
  it('uses default stderr and exit operations', async () => {
    const exitError = new Error('process exited');
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw exitError;
    });
    try {
      await expect(
        launch(() => Promise.reject(missingGetDotenv), names),
      ).rejects.toBe(exitError);
      expect(error).toHaveBeenCalledExactlyOnceWith(expectedHint);
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    } finally {
      error.mockRestore();
      exit.mockRestore();
    }
  });
  it('runs the CLI and rethrows unrelated errors', async () => {
    const run = vi.fn(() => Promise.resolve());
    await launch(() => Promise.resolve({ run }), names);
    expect(run).toHaveBeenCalledOnce();
    const error = new Error('bad load');
    await expect(launch(() => Promise.reject(error), names)).rejects.toBe(
      error,
    );
  });
});
